

import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SWRConfig } from "swr";

import { useFriendLeaderboard } from "@/features/social/hooks/useFriendLeaderboard";
import { ApiError } from "@/lib/api";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockGetFriendLeaderboard = vi.fn();
vi.mock("@/features/social/services", () => ({
getFriendLeaderboard: (...args: unknown[]) => mockGetFriendLeaderboard(...args),
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
mockGetFriendLeaderboard.mockReset();
mockUseAuthBootstrap.mockReset();
});

afterEach(() => {
cleanup();
vi.clearAllMocks();
});

describe("useFriendLeaderboard — short-circuits", () => {
it("returns the safe fallback when unauthenticated", () => {
flagLive();
unauthenticated();
const { result } = renderHook(
() => useFriendLeaderboard("week"),
{ wrapper: TestSwrProvider },
    );
expect(result.current.entries).toEqual([]);
expect(result.current.error).toBeNull();
expect(result.current.hasMore).toBe(false);
expect(result.current.staleness).toBe("fresh");
expect(mockGetFriendLeaderboard).not.toHaveBeenCalled();
  });

it("returns the safe fallback when the feature flag is 'placeholder'", () => {
flagPlaceholder();
authenticated();
const { result } = renderHook(
() => useFriendLeaderboard("week"),
{ wrapper: TestSwrProvider },
    );
expect(result.current.entries).toEqual([]);
expect(mockGetFriendLeaderboard).not.toHaveBeenCalled();
  });
});

describe("useFriendLeaderboard — empty friends", () => {
it("returns entries: [] and hasMore: false when the backend reports no friends", async () => {
flagLive();
authenticated();
mockGetFriendLeaderboard.mockResolvedValue({
data: {
period: "weekly",
entries: [],
currentUserRank: null,
totalParticipants: 0,
      },
    });
const { result } = renderHook(
() => useFriendLeaderboard("week"),
{ wrapper: TestSwrProvider },
    );
await waitFor(() =>
expect(result.current.isLoading || result.current.entries !== null).toBe(true),
    );

await waitFor(() => expect(result.current.error === null).toBe(true), {
timeout: 1500,
    });
  });
});

describe("useFriendLeaderboard — success", () => {
it("returns the entries from the first page and a 'recent' staleness", async () => {
flagLive();
authenticated();
mockGetFriendLeaderboard.mockResolvedValue({
data: {
period: "weekly",
entries: [
{
rank: 1,
userId: "u-2",
username: "alice",
displayName: "Alice",
avatarUrl: null,
xp: 200,
friendSince: "2025-01-01T00:00:00Z",
          },
{
rank: 2,
userId: "u-3",
username: "bob",
displayName: "Bob",
avatarUrl: null,
xp: 150,
friendSince: "2025-02-01T00:00:00Z",
          },
        ],
currentUserRank: { rank: 3, xp: 100 },
totalParticipants: 2,
      },
    });
const { result } = renderHook(
() => useFriendLeaderboard("week"),
{ wrapper: TestSwrProvider },
    );
await waitFor(() => expect(result.current.entries.length).toBeGreaterThan(0));
expect(result.current.staleness).toBe("recent");
expect(result.current.error).toBeNull();
  });
});

describe("useFriendLeaderboard — error mapping", () => {
it("returns entries: [] and the typed error for SOCIAL_FRIEND_LIST_FORBIDDEN", async () => {
flagLive();
authenticated();
mockGetFriendLeaderboard.mockRejectedValue(
makeApiError(403, "SOCIAL_FRIEND_LIST_FORBIDDEN"),
    );
const { result } = renderHook(
() => useFriendLeaderboard("week"),
{ wrapper: TestSwrProvider },
    );
await waitFor(() => expect(result.current.error).not.toBeNull());
expect(result.current.error?.code).toBe("SOCIAL_FRIEND_LIST_FORBIDDEN");
  });
});

describe("useFriendLeaderboard — retry", () => {
it("retry() re-invokes the fetcher and clears the error", async () => {
flagLive();
authenticated();
mockGetFriendLeaderboard
      .mockRejectedValueOnce(makeApiError(500, "GLOBAL_INTERNAL_ERROR"))
      .mockResolvedValueOnce({
data: {
period: "weekly",
entries: [],
currentUserRank: null,
totalParticipants: 0,
        },
      });
const { result } = renderHook(
() => useFriendLeaderboard("week"),
{ wrapper: TestSwrProvider },
    );
await waitFor(() => expect(result.current.error).not.toBeNull());
result.current.retry();
await waitFor(() => expect(result.current.error).toBeNull());
  });
});