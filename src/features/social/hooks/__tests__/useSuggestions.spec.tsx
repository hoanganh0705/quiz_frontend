

import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SWRConfig } from "swr";

import { ApiError } from "@/lib/api";

import { useSuggestions, resolveSuggestionsVisibility } from "@/features/social/hooks/useSuggestions";

const addBreadcrumbMock = vi.fn();
vi.mock("@sentry/nextjs", () => ({
addBreadcrumb: (...args: unknown[]) => addBreadcrumbMock(...args),
}));

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
useAuthSession: () => mockUseAuthBootstrap(),
}));

const mockGetSuggestions = vi.fn();
vi.mock("@/features/social/services/discovery.service", () => ({
getSuggestions: (...args: unknown[]) => mockGetSuggestions(...args),
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
return new ApiError({
name: "AxiosError",
message: "X",
isAxiosError: true,
response: {
status,
statusText: "X",
data: {
type: "https://api.quiz.local/problems/x",
title: "X",
status,
detail: "X",
instance: "/api/v1/x",
extensions: { code, requestId: "req-test" },
      },
headers: {},
config: undefined as never,
    },
  } as unknown as ConstructorParameters<typeof ApiError>[0]);
}

beforeEach(() => {
mockUseAuthBootstrap.mockReturnValue({
isAuthenticated: true,
isLoading: false,
error: null,
user: { userId: "viewer-1", username: "viewer", email: "viewer@test.com" },
  });
mockGetFeatureFlagValue.mockReturnValue("live");
});

afterEach(() => {
cleanup();
vi.restoreAllMocks();
vi.clearAllMocks();
});

describe("resolveSuggestionsVisibility", () => {
it("maps SOCIAL_USER_BLOCKED to blocked_by_viewer", () => {
expect(resolveSuggestionsVisibility("SOCIAL_USER_BLOCKED")).toBe("blocked_by_viewer");
  });

it("maps SOCIAL_BLOCKED_USER to blocked_viewer", () => {
expect(resolveSuggestionsVisibility("SOCIAL_BLOCKED_USER")).toBe("blocked_viewer");
  });

it("maps SOCIAL_FRIEND_LIST_FORBIDDEN to private", () => {
expect(resolveSuggestionsVisibility("SOCIAL_FRIEND_LIST_FORBIDDEN")).toBe("private");
  });

it("maps SOCIAL_USER_NOT_FOUND to not_found", () => {
expect(resolveSuggestionsVisibility("SOCIAL_USER_NOT_FOUND")).toBe("not_found");
  });

it("maps unknown codes to visible", () => {
expect(resolveSuggestionsVisibility("SOME_OTHER_CODE")).toBe("visible");
  });

it("maps undefined to visible (success)", () => {
expect(resolveSuggestionsVisibility(undefined)).toBe("visible");
  });
});

describe("useSuggestions", () => {
it("returns the documented shape on happy path", async () => {
mockGetSuggestions.mockResolvedValueOnce({
items: [
{ userId: "u1", username: "alice", avatarUrl: null, mutualFriends: 3, mutualFollowers: 1, reason: "mutual_friends" },
      ],
total: 10,
visibility: "visible",
    });

const { result } = renderHook(() => useSuggestions("target-1"), {
wrapper: TestSwrProvider,
    });

await waitFor(() => {
expect(result.current.visibility).toBe("visible");
    });
  });

it("returns safe fallback when feature flag is placeholder", async () => {
mockGetFeatureFlagValue.mockReturnValueOnce("placeholder");

const { result } = renderHook(() => useSuggestions("target-1"), {
wrapper: TestSwrProvider,
    });

expect(result.current.visibility).toBe("not_found");
expect(result.current.items).toEqual([]);
  });

it("returns safe fallback when unauthenticated", async () => {
mockUseAuthBootstrap.mockReturnValueOnce({
isAuthenticated: false,
isLoading: false,
error: null,
user: null,
    });

const { result } = renderHook(() => useSuggestions("target-1"), {
wrapper: TestSwrProvider,
    });

expect(result.current.visibility).toBe("not_found");
expect(result.current.items).toEqual([]);
  });
});
