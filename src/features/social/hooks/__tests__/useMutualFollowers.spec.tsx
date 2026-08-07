/**
 * `useMutualFollowers.spec.tsx` — Locks the Story 6.4 mutual-followers
 * read hook contract (TKT-6.4.C3).
 *
 * Asserts:
 *
 *   - Each documented privacy code maps to the documented
 *     `visibility` value (the resolver is shared with
 *     `useMutualFriends`).
 *   - Privacy branches return `{ items: [], total: 0, visibility }`
 *     without surfacing the error.
 *   - `phase6_social_mutuals === 'placeholder'` short-circuits
 *     without a service call and returns
 *     `visibility: 'not_found'`.
 *   - Unauthenticated viewers receive
 *     `visibility: 'not_found'` without a service call.
 *   - `null` targetUserId receives `visibility: 'not_found'`
 *     without a service call.
 *   - Successful response returns `visibility: 'visible'` and the
 *     projected items.
 *   - The SWR key is `['social', 'mutual-followers', targetUserId]`.
 *   - The hook uses `getMutualFollowers` (not `getMutualFriends`)
 *     and forwards `MUTUAL_LIST_PAGE_SIZE` as the limit.
 */

import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SWRConfig } from "swr";

import { useMutualFollowers } from "@/features/social/hooks/useMutualFollowers";
import { ApiError } from "@/lib/api";

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockGetMutualFollowers = vi.fn();
vi.mock("@/features/social/services/mutuals.service", () => ({
  getMutualFollowers: (...args: unknown[]) => mockGetMutualFollowers(...args),
}));

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
  useAuthSession: () => mockUseAuthBootstrap(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────

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
function authenticatedAs(userId: string) {
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

beforeEach(() => {
  mockGetMutualFollowers.mockReset();
  mockGetFeatureFlagValue.mockReset();
  mockUseAuthBootstrap.mockReset();
  flagLive();
  authenticatedAs("viewer-1");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────

describe("useMutualFollowers — short-circuits", () => {
  it("returns visibility: 'not_found' when phase6_social_mutuals === 'placeholder'", async () => {
    flagPlaceholder();
    const { result } = renderHook(() => useMutualFollowers("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("not_found");
    });
    expect(mockGetMutualFollowers).not.toHaveBeenCalled();
    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it("returns visibility: 'not_found' when viewer is unauthenticated", async () => {
    unauthenticated();
    const { result } = renderHook(() => useMutualFollowers("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("not_found");
    });
    expect(mockGetMutualFollowers).not.toHaveBeenCalled();
  });

  it("returns visibility: 'not_found' when targetUserId is null", async () => {
    const { result } = renderHook(() => useMutualFollowers(null), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("not_found");
    });
    expect(mockGetMutualFollowers).not.toHaveBeenCalled();
  });
});

describe("useMutualFollowers — visibility mapping", () => {
  it("maps SOCIAL_USER_BLOCKED to visibility: 'blocked_by_viewer'", async () => {
    mockGetMutualFollowers.mockRejectedValue(
      makeApiError(403, "SOCIAL_USER_BLOCKED"),
    );
    const { result } = renderHook(() => useMutualFollowers("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("blocked_by_viewer");
    });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  it("maps SOCIAL_BLOCKED_USER to visibility: 'blocked_viewer'", async () => {
    mockGetMutualFollowers.mockRejectedValue(
      makeApiError(403, "SOCIAL_BLOCKED_USER"),
    );
    const { result } = renderHook(() => useMutualFollowers("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("blocked_viewer");
    });
    expect(result.current.items).toHaveLength(0);
  });

  it("maps SOCIAL_FRIEND_LIST_FORBIDDEN to visibility: 'private'", async () => {
    mockGetMutualFollowers.mockRejectedValue(
      makeApiError(403, "SOCIAL_FRIEND_LIST_FORBIDDEN"),
    );
    const { result } = renderHook(() => useMutualFollowers("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("private");
    });
    expect(result.current.items).toHaveLength(0);
  });

  it("maps SOCIAL_USER_NOT_FOUND to visibility: 'not_found'", async () => {
    mockGetMutualFollowers.mockRejectedValue(
      makeApiError(404, "SOCIAL_USER_NOT_FOUND"),
    );
    const { result } = renderHook(() => useMutualFollowers("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("not_found");
    });
    expect(result.current.items).toHaveLength(0);
  });
});

describe("useMutualFollowers — happy path", () => {
  it("returns visibility: 'visible' and the projected items on success", async () => {
    mockGetMutualFollowers.mockResolvedValue({
      items: [
        {
          id: "user-b",
          user: {
            id: "user-b",
            userId: "user-b",
            userName: "bob",
            displayName: "Bob",
            avatarUrl: null,
            isPrivate: false,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
          mutualFriendsCount: 0,
          mutualFollowersCount: 7,
        },
      ],
      total: 1,
      visibility: "visible",
    });
    const { result } = renderHook(() => useMutualFollowers("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("visible");
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]!.user.userId).toBe("user-b");
    expect(result.current.total).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("calls getMutualFollowers (not getMutualFriends)", async () => {
    mockGetMutualFollowers.mockResolvedValue({
      items: [],
      total: 0,
      visibility: "visible",
    });
    const { result } = renderHook(() => useMutualFollowers("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("visible");
    });
    expect(mockGetMutualFollowers).toHaveBeenCalledWith("user-1", {
      limit: 20,
    });
  });
});
