/**
 * `useUserSocialStats.spec.tsx` — Locks the per-user stats read
 * hook contract (TKT-6.3.D1).
 *
 * Asserts:
 *
 *   - `userId === currentUserId` short-circuits without a service
 *     call and returns `visibility: 'visible'`.
 *   - `social_live === 'placeholder'` returns `visibility:
 *     'not_found'` without a service call.
 *   - `SOCIAL_USER_BLOCKED` → `visibility: 'blocked_by_viewer'`;
 *     `stats: null`; `error: null`.
 *   - `SOCIAL_BLOCKED_USER` → `visibility: 'blocked_viewer'`;
 *     `stats: null`; `error: null`.
 *   - `SOCIAL_USER_NOT_FOUND` → `visibility: 'not_found'`;
 *     `stats: null`.
 *   - `SOCIAL_FRIEND_LIST_FORBIDDEN` → `visibility: 'private'`;
 *     `stats: null`.
 *   - Successful response returns `visibility: 'visible'` and the
 *     normalized DTO.
 *   - `retry()` clears the error and revalidates.
 */

import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SWRConfig } from "swr";

import { useUserSocialStats } from "@/features/social/hooks/useUserSocialStats";
import { ApiError } from "@/lib/api";

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockGetUserSocialStats = vi.fn();
vi.mock("@/features/social/services", () => ({
  getUserSocialStats: (...args: unknown[]) => mockGetUserSocialStats(...args),
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
  mockGetFeatureFlagValue.mockReset();
  mockGetUserSocialStats.mockReset();
  mockUseAuthBootstrap.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────

describe("useUserSocialStats — short-circuits", () => {
  it("short-circuits when the viewer IS the target (no service call)", async () => {
    flagLive();
    authenticatedAs("user-1");
    const { result } = renderHook(
      () => useUserSocialStats("user-1"),
      { wrapper: TestSwrProvider },
    );
    expect(result.current.stats).toBeNull();
    expect(result.current.visibility).toBe("visible");
    expect(result.current.isLoading).toBe(false);
    expect(mockGetUserSocialStats).not.toHaveBeenCalled();
  });

  it("short-circuits when the feature flag is 'placeholder'", async () => {
    flagPlaceholder();
    authenticatedAs("viewer-1");
    const { result } = renderHook(
      () => useUserSocialStats("target-1"),
      { wrapper: TestSwrProvider },
    );
    expect(result.current.stats).toBeNull();
    expect(result.current.visibility).toBe("not_found");
    expect(mockGetUserSocialStats).not.toHaveBeenCalled();
  });
});

describe("useUserSocialStats — privacy mapping", () => {
  it("maps SOCIAL_USER_BLOCKED to visibility: 'blocked_by_viewer'", async () => {
    flagLive();
    authenticatedAs("viewer-1");
    mockGetUserSocialStats.mockRejectedValue(
      makeApiError(403, "SOCIAL_USER_BLOCKED"),
    );
    const { result } = renderHook(
      () => useUserSocialStats("target-1"),
      { wrapper: TestSwrProvider },
    );
    await waitFor(() => expect(result.current.visibility).toBe("blocked_by_viewer"));
    expect(result.current.stats).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("maps SOCIAL_BLOCKED_USER to visibility: 'blocked_viewer'", async () => {
    flagLive();
    authenticatedAs("viewer-1");
    mockGetUserSocialStats.mockRejectedValue(
      makeApiError(403, "SOCIAL_BLOCKED_USER"),
    );
    const { result } = renderHook(
      () => useUserSocialStats("target-1"),
      { wrapper: TestSwrProvider },
    );
    await waitFor(() => expect(result.current.visibility).toBe("blocked_viewer"));
    expect(result.current.stats).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("maps SOCIAL_USER_NOT_FOUND to visibility: 'not_found'", async () => {
    flagLive();
    authenticatedAs("viewer-1");
    mockGetUserSocialStats.mockRejectedValue(
      makeApiError(404, "SOCIAL_USER_NOT_FOUND"),
    );
    const { result } = renderHook(
      () => useUserSocialStats("target-1"),
      { wrapper: TestSwrProvider },
    );
    await waitFor(() => expect(result.current.visibility).toBe("not_found"));
    expect(result.current.stats).toBeNull();
  });

  it("maps SOCIAL_FRIEND_LIST_FORBIDDEN to visibility: 'private'", async () => {
    flagLive();
    authenticatedAs("viewer-1");
    mockGetUserSocialStats.mockRejectedValue(
      makeApiError(403, "SOCIAL_FRIEND_LIST_FORBIDDEN"),
    );
    const { result } = renderHook(
      () => useUserSocialStats("target-1"),
      { wrapper: TestSwrProvider },
    );
    await waitFor(() => expect(result.current.visibility).toBe("private"));
    expect(result.current.stats).toBeNull();
  });
});

describe("useUserSocialStats — success", () => {
  it("returns the normalized DTO and visibility: 'visible' on success", async () => {
    flagLive();
    authenticatedAs("viewer-1");
    mockGetUserSocialStats.mockResolvedValue({
      data: { friends: 12, followers: 100, following: 50 },
    });
    const { result } = renderHook(
      () => useUserSocialStats("target-1"),
      { wrapper: TestSwrProvider },
    );
    await waitFor(() => expect(result.current.stats).not.toBeNull());
    expect(result.current.visibility).toBe("visible");
    expect(result.current.stats?.friends).toBe(12);
    expect(result.current.stats?.followers).toBe(100);
    expect(result.current.stats?.following).toBe(50);
    expect(result.current.error).toBeNull();
  });
});

describe("useUserSocialStats — retry", () => {
  it("retry() re-invokes the fetcher and clears the error", async () => {
    flagLive();
    authenticatedAs("viewer-1");
    mockGetUserSocialStats
      .mockRejectedValueOnce(makeApiError(500, "GLOBAL_INTERNAL_ERROR"))
      .mockResolvedValueOnce({
        data: { friends: 5, followers: 20, following: 30 },
      });
    const { result } = renderHook(
      () => useUserSocialStats("target-1"),
      { wrapper: TestSwrProvider },
    );
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.stats).toBeNull();
    result.current.retry();
    await waitFor(() => expect(result.current.stats).not.toBeNull());
    expect(result.current.error).toBeNull();
    expect(mockGetUserSocialStats).toHaveBeenCalledTimes(2);
  });
});

describe("useUserSocialStats — unauthenticated", () => {
  it("does not call the service for unauthenticated viewers", async () => {
    flagLive();
    unauthenticated();
    const { result } = renderHook(
      () => useUserSocialStats("target-1"),
      { wrapper: TestSwrProvider },
    );
    // The hook is gated by the key; with `null` key, the
    // primitive does not fire a service call regardless of
    // loading state.
    expect(mockGetUserSocialStats).not.toHaveBeenCalled();
    expect(result.current.stats).toBeNull();
  });
});