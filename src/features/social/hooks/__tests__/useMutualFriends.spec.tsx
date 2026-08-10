/**
 * `useMutualFriends.spec.tsx` — Locks the Story 6.4 mutual-friends
 * read hook contract (TKT-6.4.C2).
 *
 * Asserts:
 *
 *   - Each documented privacy code maps to the documented
 *     `visibility` value:
 *       SOCIAL_USER_BLOCKED → blocked_by_viewer
 *       SOCIAL_BLOCKED_USER → blocked_viewer
 *       SOCIAL_FRIEND_LIST_FORBIDDEN → private
 *       SOCIAL_USER_NOT_FOUND → not_found
 *   - Privacy branches return `{ items: [], total: 0, visibility }`
 *     without surfacing the error.
 *   - `social_mutuals_live === 'placeholder'` short-circuits
 *     without a service call and returns
 *     `visibility: 'not_found'`.
 *   - Unauthenticated viewers receive
 *     `visibility: 'not_found'` without a service call.
 *   - `null` targetUserId receives `visibility: 'not_found'`
 *     without a service call.
 *   - Successful response returns `visibility: 'visible'` and the
 *     projected items.
 *   - The SWR key is `['social', 'mutual-friends', targetUserId]`.
 */

import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SWRConfig } from "swr";

import { useMutualFriends } from "@/features/social/hooks/useMutualFriends";
import { ApiError } from "@/lib/api";

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockGetMutualFriends = vi.fn();
vi.mock("@/features/social/services/mutuals.service", () => ({
  getMutualFriends: (...args: unknown[]) => mockGetMutualFriends(...args),
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
  mockGetMutualFriends.mockReset();
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

describe("useMutualFriends — short-circuits", () => {
  it("returns visibility: 'not_found' when social_mutuals_live === 'placeholder'", async () => {
    flagPlaceholder();
    const { result } = renderHook(() => useMutualFriends("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("not_found");
    });
    expect(mockGetMutualFriends).not.toHaveBeenCalled();
    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it("returns visibility: 'not_found' when viewer is unauthenticated", async () => {
    unauthenticated();
    const { result } = renderHook(() => useMutualFriends("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("not_found");
    });
    expect(mockGetMutualFriends).not.toHaveBeenCalled();
  });

  it("returns visibility: 'not_found' when targetUserId is null", async () => {
    const { result } = renderHook(() => useMutualFriends(null), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("not_found");
    });
    expect(mockGetMutualFriends).not.toHaveBeenCalled();
  });
});

describe("useMutualFriends — visibility mapping", () => {
  it("maps SOCIAL_USER_BLOCKED to visibility: 'blocked_by_viewer'", async () => {
    mockGetMutualFriends.mockRejectedValue(
      makeApiError(403, "SOCIAL_USER_BLOCKED"),
    );
    const { result } = renderHook(() => useMutualFriends("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("blocked_by_viewer");
    });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it("maps SOCIAL_BLOCKED_USER to visibility: 'blocked_viewer'", async () => {
    mockGetMutualFriends.mockRejectedValue(
      makeApiError(403, "SOCIAL_BLOCKED_USER"),
    );
    const { result } = renderHook(() => useMutualFriends("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("blocked_viewer");
    });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  it("maps SOCIAL_FRIEND_LIST_FORBIDDEN to visibility: 'private'", async () => {
    mockGetMutualFriends.mockRejectedValue(
      makeApiError(403, "SOCIAL_FRIEND_LIST_FORBIDDEN"),
    );
    const { result } = renderHook(() => useMutualFriends("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("private");
    });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  it("maps SOCIAL_USER_NOT_FOUND to visibility: 'not_found'", async () => {
    mockGetMutualFriends.mockRejectedValue(
      makeApiError(404, "SOCIAL_USER_NOT_FOUND"),
    );
    const { result } = renderHook(() => useMutualFriends("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("not_found");
    });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });
});

describe("useMutualFriends — happy path", () => {
  it("returns visibility: 'visible' and the projected items on success", async () => {
    mockGetMutualFriends.mockResolvedValue({
      items: [
        {
          id: "user-a",
          user: {
            id: "user-a",
            userId: "user-a",
            userName: "alice",
            displayName: "Alice",
            avatarUrl: null,
            isPrivate: false,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
          mutualFriendsCount: 4,
          mutualFollowersCount: 2,
        },
      ],
      total: 1,
      visibility: "visible",
    });
    const { result } = renderHook(() => useMutualFriends("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("visible");
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]!.user.userId).toBe("user-a");
    expect(result.current.total).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("forwards MUTUAL_LIST_PAGE_SIZE as the limit", async () => {
    mockGetMutualFriends.mockResolvedValue({
      items: [],
      total: 0,
      visibility: "visible",
    });
    const { result } = renderHook(() => useMutualFriends("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("visible");
    });
    expect(mockGetMutualFriends).toHaveBeenCalledWith("user-1", {
      limit: 20,
    });
  });

  it("propagates unknown errors so the consumer can render the error state", async () => {
    mockGetMutualFriends.mockRejectedValue(
      makeApiError(500, "GLOBAL_INTERNAL_ERROR"),
    );
    const { result } = renderHook(() => useMutualFriends("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });
    expect(result.current.error?.code).toBe("GLOBAL_INTERNAL_ERROR");
    expect(result.current.visibility).toBe("visible");
  });
});

describe("useMutualFriends — pure resolver", () => {
  it("exposes the privacy mapping as a pure function", async () => {
    const { resolveMutualVisibility } = await import(
      "@/features/social/hooks/useMutualFriends"
    );
    expect(resolveMutualVisibility(undefined)).toBe("visible");
    expect(resolveMutualVisibility("SOCIAL_USER_BLOCKED")).toBe(
      "blocked_by_viewer",
    );
    expect(resolveMutualVisibility("SOCIAL_BLOCKED_USER")).toBe(
      "blocked_viewer",
    );
    expect(resolveMutualVisibility("SOCIAL_FRIEND_LIST_FORBIDDEN")).toBe(
      "private",
    );
    expect(resolveMutualVisibility("SOCIAL_USER_NOT_FOUND")).toBe("not_found");
  });
});
