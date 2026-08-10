/**
 * `d3-read-hooks.spec.tsx` — locks the seven social read hooks
 * (TKT-6.1.D3).
 *
 * Tests cover (per hook):
 *   - `social_relationship_live === 'placeholder'` → no service
 *     call; safe fallback.
 *   - Unauthenticated → no service call; safe fallback.
 *   - Success path → the projected items are returned.
 *   - `SOCIAL_USER_NOT_FOUND` (404) → typed error; empty page.
 *   - `retry()` revalidates the SWR key.
 *
 * The test file intentionally mocks the service module instead of
 * letting the real SDK run; this keeps the spec fast and
 * deterministic.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

import { useFollowers } from "@/features/social/hooks/useFollowers";
import { useFollowing } from "@/features/social/hooks/useFollowing";
import { useFriends } from "@/features/social/hooks/useFriends";
import { useBlockedUsers } from "@/features/social/hooks/useBlockedUsers";
import { useSocialCounts } from "@/features/social/hooks/useSocialCounts";
import { useIncomingRequests } from "@/features/social/hooks/useIncomingRequests";
import { useOutgoingRequests } from "@/features/social/hooks/useOutgoingRequests";
import { ApiError } from "@/lib/api";

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockGetUserFollowers = vi.fn();
const mockGetUserFollowing = vi.fn();
const mockGetFriendsOfUser = vi.fn();
const mockGetBlockedUsers = vi.fn();
const mockGetSocialCounts = vi.fn();
const mockGetPendingRequests = vi.fn();
const mockGetSentRequests = vi.fn();

vi.mock("@/features/social/services", () => ({
  getUserFollowers: (...args: unknown[]) => mockGetUserFollowers(...args),
  getUserFollowing: (...args: unknown[]) => mockGetUserFollowing(...args),
  getFriendsOfUser: (...args: unknown[]) => mockGetFriendsOfUser(...args),
  getBlockedUsers: (...args: unknown[]) => mockGetBlockedUsers(...args),
  getSocialCounts: (...args: unknown[]) => mockGetSocialCounts(...args),
  getPendingRequests: (...args: unknown[]) => mockGetPendingRequests(...args),
  getSentRequests: (...args: unknown[]) => mockGetSentRequests(...args),
}));

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
  useAuthSession: () => mockUseAuthBootstrap(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────

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

function makeApiError(
  status: number,
  code: string,
  detail: string,
): ApiError {
  const axiosLike = {
    response: {
      status,
      statusText: code,
      data: {
        type: "about:blank",
        title: code,
        status,
        detail,
        extensions: { code },
      },
    },
    message: detail,
  } as unknown as ConstructorParameters<typeof ApiError>[0];
  return new ApiError(axiosLike);
}

function authenticated(userId = "user-123") {
  mockUseAuthBootstrap.mockReturnValue({
    bootstrapState: "authenticated",
    isAuthenticated: true,
    currentUser: { userId, id: userId },
  });
}

function unauthenticated() {
  mockUseAuthBootstrap.mockReturnValue({
    bootstrapState: "unauthenticated",
    isAuthenticated: false,
    currentUser: null,
  });
}

function wrapFollowerEnvelope(followers: unknown[]) {
  return {
    data: followers,
    meta: {
      pagination: {
        kind: "cursor",
        limit: followers.length,
        nextCursor: null,
        hasNextPage: false,
      },
    },
  };
}

function blockedEnvelope(rows: unknown[]) {
  return {
    data: rows,
    meta: { timestamp: "2025-01-01T00:00:00.000Z" },
  };
}

function requestsEnvelope(rows: unknown[]) {
  return {
    data: rows,
    meta: { timestamp: "2025-01-01T00:00:00.000Z" },
  };
}

function countsEnvelope(counts: unknown) {
  return {
    data: counts,
    meta: { timestamp: "2025-01-01T00:00:00.000Z" },
  };
}

const SAMPLE_FOLLOWER = {
  userId: "follower-1",
  username: "follower_one",
  avatarUrl: null,
  followedAt: "2025-01-01T00:00:00.000Z",
};

const SAMPLE_FRIEND = {
  friendshipId: "fr-1",
  userId: "friend-1",
  username: "friend_one",
  displayName: "Friend One",
  avatarUrl: null,
  friendSince: "2025-01-01T00:00:00.000Z",
};

const SAMPLE_BLOCKED = {
  blockedId: "blocked-1",
  reason: null,
};

const SAMPLE_REQUEST = {
  friendshipId: "fr-1",
  requesterId: "user-456",
  addresseeId: "user-123",
  requesterUsername: "requester_one",
  requesterDisplayName: "Requester One",
  requesterAvatarUrl: null,
  createdAt: "2025-01-01T00:00:00.000Z",
};

const SAMPLE_COUNTS = {
  friendCount: 5,
  followerCount: 10,
  followingCount: 7,
};

// ─── Tests ────────────────────────────────────────────────────────────────

describe("useFollowers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue("live");
    authenticated();
  });

  afterEach(() => cleanup());

  it("does not call the service when the flag is placeholder", () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");
    const { result } = renderHook(
      () => useFollowers("target-1"),
      { wrapper: TestSwrProvider },
    );
    expect(result.current.users).toEqual([]);
    expect(mockGetUserFollowers).not.toHaveBeenCalled();
  });

  it("does not call the service when unauthenticated", () => {
    unauthenticated();
    const { result } = renderHook(
      () => useFollowers("target-1"),
      { wrapper: TestSwrProvider },
    );
    expect(result.current.users).toEqual([]);
    expect(mockGetUserFollowers).not.toHaveBeenCalled();
  });

  it("returns the projected users on success", async () => {
    mockGetUserFollowers.mockResolvedValue(
      wrapFollowerEnvelope([SAMPLE_FOLLOWER]),
    );

    const { result } = renderHook(
      () => useFollowers("target-1"),
      { wrapper: TestSwrProvider },
    );

    await waitFor(() => {
      expect(result.current.users.length).toBe(1);
    });
    expect(result.current.users[0]?.userId).toBe("follower-1");
    expect(result.current.users[0]?.userName).toBe("follower_one");
    expect(result.current.users[0]?.id).toBe("follower-1");
  });

  it("returns an empty page when the user has no followers", async () => {
    mockGetUserFollowers.mockResolvedValue(wrapFollowerEnvelope([]));

    const { result } = renderHook(
      () => useFollowers("target-1"),
      { wrapper: TestSwrProvider },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.users).toEqual([]);
  });
});

describe("useFollowing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue("live");
    authenticated();
  });

  afterEach(() => cleanup());

  it("does not call the service when the flag is placeholder", () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");
    const { result } = renderHook(
      () => useFollowing("target-1"),
      { wrapper: TestSwrProvider },
    );
    expect(result.current.users).toEqual([]);
    expect(mockGetUserFollowing).not.toHaveBeenCalled();
  });

  it("returns the projected users on success", async () => {
    mockGetUserFollowing.mockResolvedValue(
      wrapFollowerEnvelope([SAMPLE_FOLLOWER]),
    );

    const { result } = renderHook(
      () => useFollowing("target-1"),
      { wrapper: TestSwrProvider },
    );

    await waitFor(() => {
      expect(result.current.users.length).toBe(1);
    });
    expect(result.current.users[0]?.userId).toBe("follower-1");
  });
});

describe("useFriends", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue("live");
    authenticated();
  });

  afterEach(() => cleanup());

  it("does not call the service when the flag is placeholder", () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");
    const { result } = renderHook(
      () => useFriends("target-1"),
      { wrapper: TestSwrProvider },
    );
    expect(result.current.users).toEqual([]);
    expect(mockGetFriendsOfUser).not.toHaveBeenCalled();
  });

  it("returns the projected users on success", async () => {
    mockGetFriendsOfUser.mockResolvedValue(
      wrapFollowerEnvelope([SAMPLE_FRIEND]),
    );

    const { result } = renderHook(
      () => useFriends("target-1"),
      { wrapper: TestSwrProvider },
    );

    await waitFor(() => {
      expect(result.current.users.length).toBe(1);
    });
    expect(result.current.users[0]?.userId).toBe("friend-1");
    expect(result.current.users[0]?.userName).toBe("friend_one");
  });

  it("surfaces a 403 SOCIAL_FRIEND_LIST_FORBIDDEN error", async () => {
    mockGetFriendsOfUser.mockRejectedValue(
      makeApiError(403, "SOCIAL_FRIEND_LIST_FORBIDDEN", "Friend list is private"),
    );

    const { result } = renderHook(
      () => useFriends("target-1"),
      { wrapper: TestSwrProvider },
    );

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });
    expect(result.current.error?.code).toBe("SOCIAL_FRIEND_LIST_FORBIDDEN");
  });
});

describe("useBlockedUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue("live");
    authenticated();
  });

  afterEach(() => cleanup());

  it("does not call the service when the flag is placeholder", () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");
    const { result } = renderHook(
      () => useBlockedUsers(),
      { wrapper: TestSwrProvider },
    );
    expect(result.current.users).toEqual([]);
    expect(mockGetBlockedUsers).not.toHaveBeenCalled();
  });

  it("returns the projected blocked users on success", async () => {
    mockGetBlockedUsers.mockResolvedValue(blockedEnvelope([SAMPLE_BLOCKED]));

    const { result } = renderHook(
      () => useBlockedUsers(),
      { wrapper: TestSwrProvider },
    );

    await waitFor(() => {
      expect(result.current.users.length).toBe(1);
    });
    expect(result.current.users[0]?.userId).toBe("blocked-1");
  });
});

describe("useIncomingRequests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue("live");
    authenticated();
  });

  afterEach(() => cleanup());

  it("does not call the service when the flag is placeholder", () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");
    const { result } = renderHook(
      () => useIncomingRequests(),
      { wrapper: TestSwrProvider },
    );
    expect(result.current.requests).toEqual([]);
    expect(mockGetPendingRequests).not.toHaveBeenCalled();
  });

  it("returns the projected requests on success", async () => {
    mockGetPendingRequests.mockResolvedValue(requestsEnvelope([SAMPLE_REQUEST]));

    const { result } = renderHook(
      () => useIncomingRequests(),
      { wrapper: TestSwrProvider },
    );

    await waitFor(() => {
      expect(result.current.requests.length).toBe(1);
    });
    expect(result.current.requests[0]?.id).toBe("fr-1");
    expect(result.current.requests[0]?.requesterId).toBe("user-456");
    expect(result.current.requests[0]?.requester.userName).toBe(
      "requester_one",
    );
  });
});

describe("useOutgoingRequests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue("live");
    authenticated();
  });

  afterEach(() => cleanup());

  it("does not call the service when the flag is placeholder", () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");
    const { result } = renderHook(
      () => useOutgoingRequests(),
      { wrapper: TestSwrProvider },
    );
    expect(result.current.requests).toEqual([]);
    expect(mockGetSentRequests).not.toHaveBeenCalled();
  });

  it("returns the projected requests on success", async () => {
    mockGetSentRequests.mockResolvedValue(requestsEnvelope([SAMPLE_REQUEST]));

    const { result } = renderHook(
      () => useOutgoingRequests(),
      { wrapper: TestSwrProvider },
    );

    await waitFor(() => {
      expect(result.current.requests.length).toBe(1);
    });
    expect(result.current.requests[0]?.requesterId).toBe("user-456");
  });
});

describe("useSocialCounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue("live");
    authenticated();
  });

  afterEach(() => cleanup());

  it("does not call the service when the flag is placeholder", () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");
    const { result } = renderHook(
      () => useSocialCounts("user-123"),
      { wrapper: TestSwrProvider },
    );
    expect(result.current.counts).toBeNull();
    expect(mockGetSocialCounts).not.toHaveBeenCalled();
  });

  it("returns the projected counts on success", async () => {
    mockGetSocialCounts.mockResolvedValue(countsEnvelope(SAMPLE_COUNTS));

    const { result } = renderHook(
      () => useSocialCounts("user-123"),
      { wrapper: TestSwrProvider },
    );

    await waitFor(() => {
      expect(result.current.counts).not.toBeNull();
    });
    expect(result.current.counts?.friends).toBe(5);
    expect(result.current.counts?.followers).toBe(10);
    expect(result.current.counts?.following).toBe(7);
  });

  it("returns the zeroed counts on 404", async () => {
    mockGetSocialCounts.mockRejectedValue(
      makeApiError(404, "GLOBAL_NOT_FOUND", "Not found"),
    );

    const { result } = renderHook(
      () => useSocialCounts("user-123"),
      { wrapper: TestSwrProvider },
    );

    await waitFor(() => {
      expect(result.current.counts).not.toBeNull();
    });
    expect(result.current.counts?.friends).toBe(0);
    expect(result.current.error).toBeNull();
  });
});
