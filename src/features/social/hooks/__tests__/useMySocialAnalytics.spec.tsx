

import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SWRConfig } from "swr";

import { useMySocialAnalytics } from "@/features/social/hooks/useMySocialAnalytics";
import { ApiError } from "@/lib/api";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockGetMySocialAnalytics = vi.fn();
vi.mock("@/features/social/services", () => ({
getMySocialAnalytics: (...args: unknown[]) => mockGetMySocialAnalytics(...args),
}));

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
useAuthSession: () => mockUseAuthBootstrap(),
}));

function TestSwrProvider({ children }: { children: React.ReactNode }) {
return (
<SWRConfig
value={{
provider: () => new Map(),
revalidateOnFocus: false,
revalidateIfStale: false,
dedupingInterval: 0,
errorRetryCount: 0,
      }}
    >
{children}
</SWRConfig>
  );
}

function makeApiError(status: number, code: string): ApiError {
const axiosLike = {
response: {
status,
statusText: code,
data: {
type: "about:blank",
title: code,
status,
detail: `test error ${code}`,
extensions: { code },
      },
    },
message: `test error ${code}`,
  } as unknown as ConstructorParameters<typeof ApiError>[0];
return new ApiError(axiosLike);
}

function flagLive() {
mockGetFeatureFlagValue.mockReturnValue("live");
}
function flagPlaceholder() {
mockGetFeatureFlagValue.mockReturnValue("placeholder");
}
function authenticated() {
mockUseAuthBootstrap.mockReturnValue({
bootstrapState: "authenticated",
isAuthenticated: true,
currentUser: { userId: "user-1", id: "user-1" },
  });
}
function unauthenticated() {
mockUseAuthBootstrap.mockReturnValue({
bootstrapState: "unauthenticated",
isAuthenticated: false,
currentUser: null,
  });
}

beforeEach(() => {
mockGetFeatureFlagValue.mockReset();
mockGetMySocialAnalytics.mockReset();
mockUseAuthBootstrap.mockReset();
});

afterEach(() => {
cleanup();
vi.clearAllMocks();
});

describe("useMySocialAnalytics — short-circuits", () => {
it("returns the safe fallback when unauthenticated (no service call)", () => {
flagLive();
unauthenticated();
const { result } = renderHook(
() => useMySocialAnalytics("week"),
{ wrapper: TestSwrProvider },
    );
expect(result.current.analytics).toBeNull();
expect(result.current.error).toBeNull();
expect(result.current.staleness).toBe("fresh");
expect(mockGetMySocialAnalytics).not.toHaveBeenCalled();
  });

it("returns the safe fallback when the feature flag is 'placeholder'", () => {
flagPlaceholder();
authenticated();
const { result } = renderHook(
() => useMySocialAnalytics("week"),
{ wrapper: TestSwrProvider },
    );
expect(result.current.analytics).toBeNull();
expect(mockGetMySocialAnalytics).not.toHaveBeenCalled();
  });
});

describe("useMySocialAnalytics — period-driven SWR key", () => {
it("fetches again when the period changes", async () => {
flagLive();
authenticated();
mockGetMySocialAnalytics.mockResolvedValue({
data: { friends: 1, followers: 1, following: 1, growth30Days: 0 },
    });
const { result, rerender } = renderHook(
({ period }: { period: "week" | "month" | "all" }) =>
useMySocialAnalytics(period),
{
wrapper: TestSwrProvider,
initialProps: { period: "week" as "week" | "month" | "all" },
      },
    );
await waitFor(() => expect(result.current.analytics).not.toBeNull());
expect(mockGetMySocialAnalytics).toHaveBeenCalledTimes(1);
rerender({ period: "month" as "week" | "month" | "all" });
await waitFor(() => expect(mockGetMySocialAnalytics).toHaveBeenCalledTimes(2));
  });
});

describe("useMySocialAnalytics — success", () => {
it("returns the normalized DTO and 'recent' staleness on success", async () => {
flagLive();
authenticated();
mockGetMySocialAnalytics.mockResolvedValue({
data: { friends: 5, followers: 50, following: 30, growth30Days: 7 },
    });
const { result } = renderHook(
() => useMySocialAnalytics("week"),
{ wrapper: TestSwrProvider },
    );
await waitFor(() => expect(result.current.analytics).not.toBeNull());
expect(result.current.analytics?.friends).toBe(5);
expect(result.current.analytics?.followers).toBe(50);
expect(result.current.analytics?.following).toBe(30);
expect(result.current.analytics?.growth30Days).toBe(7);
expect(result.current.staleness).toBe("recent");
expect(result.current.error).toBeNull();
  });

it("maps an isStale: true payload to 'stale' staleness", async () => {
flagLive();
authenticated();
mockGetMySocialAnalytics.mockResolvedValue({
data: {
friends: 5,
followers: 50,
following: 30,
growth30Days: 7,
isStale: true,
      },
    });
const { result } = renderHook(
() => useMySocialAnalytics("week"),
{ wrapper: TestSwrProvider },
    );
await waitFor(() => expect(result.current.analytics).not.toBeNull());
expect(result.current.staleness).toBe("stale");
  });
});

describe("useMySocialAnalytics — error mapping", () => {
it("maps SOCIAL_USER_NOT_FOUND to error and analytics: null", async () => {
flagLive();
authenticated();
mockGetMySocialAnalytics.mockRejectedValue(
makeApiError(404, "SOCIAL_USER_NOT_FOUND"),
    );
const { result } = renderHook(
() => useMySocialAnalytics("week"),
{ wrapper: TestSwrProvider },
    );
await waitFor(() => expect(result.current.error).not.toBeNull());
expect(result.current.analytics).toBeNull();
  });
});

describe("useMySocialAnalytics — retry", () => {
it("retry() re-invokes the fetcher and clears the error", async () => {
flagLive();
authenticated();
mockGetMySocialAnalytics
      .mockRejectedValueOnce(makeApiError(500, "GLOBAL_INTERNAL_ERROR"))
      .mockResolvedValueOnce({
data: { friends: 1, followers: 1, following: 1, growth30Days: 0 },
      });
const { result } = renderHook(
() => useMySocialAnalytics("week"),
{ wrapper: TestSwrProvider },
    );
await waitFor(() => expect(result.current.error).not.toBeNull());
result.current.retry();
await waitFor(() => expect(result.current.analytics).not.toBeNull());
expect(result.current.error).toBeNull();
expect(mockGetMySocialAnalytics).toHaveBeenCalledTimes(2);
  });
});