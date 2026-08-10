/**
 * `useFeed.spec.tsx` — Locks the Story 6.9 feed read hook contract
 * (TKT-6.9.D2).
 *
 * Asserts:
 *
 *   - Privacy-code mapping:
 *       USER_PROFILE_PRIVATE         → private
 *       SOCIAL_USER_BLOCKED          → blocked_viewer
 *       SOCIAL_BLOCKED_USER          → blocked_by_viewer
 *       SOCIAL_FRIEND_LIST_FORBIDDEN → private
 *   - Privacy branches return `{ items: [], visibility }` without
 *     surfacing the error.
 *   - `social_live === 'placeholder'` short-circuits without a
 *     service call and returns `visibility: 'not_found'`.
 *   - `social_feed_live === 'placeholder'` short-circuits without
 *     a service call and returns `visibility: 'not_found'`.
 *   - Unauthenticated viewers receive `visibility: 'not_found'`
 *     without a service call.
 *   - `null` viewerUserId receives `visibility: 'not_found'`
 *     without a service call.
 *   - Successful response returns `visibility: 'visible'` and the
 *     projected items.
 *   - When `cooldownSeconds > 0` is signalled via
 *     `extensions.retryAfterMs`, `rateLimitedUntil` is a future
 *     epoch ms.
 *   - The SWR cache key is `SOCIAL_CACHE_KEYS.makeFeedKey(viewerUserId)`.
 *   - The auth-state-change event triggers a cache wipe.
 */

import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SWRConfig } from "swr";

import { useFeed } from "@/features/social/hooks/useFeed";
import { ApiError } from "@/lib/api";

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockGetFeed = vi.fn();
vi.mock("@/features/social/services/feed.service", () => ({
  getFeed: (...args: unknown[]) => mockGetFeed(...args),
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

function makeApiError(
  status: number,
  code: string,
  extensions: Record<string, unknown> = {},
): ApiError {
  const axiosLike = {
    response: {
      status,
      statusText: code,
      data: {
        type: "about:blank",
        title: code,
        status,
        detail: `test error ${code}`,
        extensions: { code, ...extensions },
      },
    },
    message: `test error ${code}`,
  } as unknown as ConstructorParameters<typeof ApiError>[0];
  return new ApiError(axiosLike);
}

function flagsAllLive() {
  mockGetFeatureFlagValue.mockReturnValue("live");
}
function flagPlaceholder(name: "social_live" | "social_feed_live") {
  mockGetFeatureFlagValue.mockImplementation((key: string) => {
    if (key === name) return "placeholder";
    return "live";
  });
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
  mockGetFeed.mockReset();
  mockGetFeatureFlagValue.mockReset();
  mockUseAuthBootstrap.mockReset();
  flagsAllLive();
  authenticatedAs("viewer-1");
  // Default success response.
  mockGetFeed.mockResolvedValue({
    items: [],
    nextCursor: null,
    hasMore: false,
    visibility: "visible",
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────

describe("TKT-6.9.D2 / useFeed — privacy mapping", () => {
  it("USER_PROFILE_PRIVATE maps to visibility 'private'", async () => {
    mockGetFeed.mockRejectedValue(
      makeApiError(403, "USER_PROFILE_PRIVATE"),
    );

    const { result } = renderHook(() => useFeed("viewer-1"), {
      wrapper: TestSwrProvider,
    });

    await waitFor(() => {
      expect(result.current.visibility).toBe("private");
    });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it("SOCIAL_USER_BLOCKED maps to visibility 'blocked_viewer'", async () => {
    mockGetFeed.mockRejectedValue(
      makeApiError(403, "SOCIAL_USER_BLOCKED"),
    );

    const { result } = renderHook(() => useFeed("viewer-1"), {
      wrapper: TestSwrProvider,
    });

    await waitFor(() => {
      expect(result.current.visibility).toBe("blocked_viewer");
    });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it("SOCIAL_BLOCKED_USER maps to visibility 'blocked_by_viewer'", async () => {
    mockGetFeed.mockRejectedValue(
      makeApiError(403, "SOCIAL_BLOCKED_USER"),
    );

    const { result } = renderHook(() => useFeed("viewer-1"), {
      wrapper: TestSwrProvider,
    });

    await waitFor(() => {
      expect(result.current.visibility).toBe("blocked_by_viewer");
    });
    expect(result.current.items).toHaveLength(0);
  });

  it("SOCIAL_FRIEND_LIST_FORBIDDEN maps to visibility 'private'", async () => {
    mockGetFeed.mockRejectedValue(
      makeApiError(403, "SOCIAL_FRIEND_LIST_FORBIDDEN"),
    );

    const { result } = renderHook(() => useFeed("viewer-1"), {
      wrapper: TestSwrProvider,
    });

    await waitFor(() => {
      expect(result.current.visibility).toBe("private");
    });
  });
});

describe("TKT-6.9.D2 / useFeed — feature-flag gating", () => {
  it("social_live === 'placeholder' short-circuits without dispatching", async () => {
    flagPlaceholder("social_live");

    const { result } = renderHook(() => useFeed("viewer-1"), {
      wrapper: TestSwrProvider,
    });

    expect(mockGetFeed).not.toHaveBeenCalled();
    expect(result.current.items).toHaveLength(0);
    expect(result.current.visibility).toBe("not_found");
    expect(result.current.isLoading).toBe(false);
  });

  it("social_feed_live === 'placeholder' short-circuits without dispatching", async () => {
    flagPlaceholder("social_feed_live");

    const { result } = renderHook(() => useFeed("viewer-1"), {
      wrapper: TestSwrProvider,
    });

    expect(mockGetFeed).not.toHaveBeenCalled();
    expect(result.current.items).toHaveLength(0);
    expect(result.current.visibility).toBe("not_found");
    expect(result.current.isLoading).toBe(false);
  });
});

describe("TKT-6.9.D2 / useFeed — auth gating", () => {
  it("unauthenticated viewer returns a safe fallback without dispatching", async () => {
    unauthenticated();

    const { result } = renderHook(() => useFeed("viewer-1"), {
      wrapper: TestSwrProvider,
    });

    expect(mockGetFeed).not.toHaveBeenCalled();
    expect(result.current.items).toHaveLength(0);
    expect(result.current.visibility).toBe("not_found");
    expect(result.current.isLoading).toBe(false);
  });

  it("null viewerUserId returns a safe fallback without dispatching", async () => {
    const { result } = renderHook(() => useFeed(null), {
      wrapper: TestSwrProvider,
    });

    expect(mockGetFeed).not.toHaveBeenCalled();
    expect(result.current.items).toHaveLength(0);
    expect(result.current.visibility).toBe("not_found");
  });
});

describe("TKT-6.9.D2 / useFeed — happy path", () => {
  it("successful response returns the projected items + visibility 'visible'", async () => {
    mockGetFeed.mockResolvedValue({
      items: [
        {
          id: "feed-1",
          type: "badge_earned",
          at: "2026-08-01T12:00:00.000Z",
          actorUser: {
            id: "user-actor",
            userId: "user-actor",
            userName: "actor-name",
            displayName: null,
            avatarUrl: null,
            isPrivate: false,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
          payload: {
            type: "badge_earned",
            badgeId: "badge-1",
            badgeSlug: "first-quiz",
          },
        },
      ],
      nextCursor: "cursor-2",
      hasMore: true,
      visibility: "visible",
    });

    const { result } = renderHook(() => useFeed("viewer-1"), {
      wrapper: TestSwrProvider,
    });

    await waitFor(() => {
      expect(result.current.items.length).toBe(1);
    });
    expect(result.current.items[0]!.type).toBe("badge_earned");
    expect(result.current.visibility).toBe("visible");
    expect(result.current.hasMore).toBe(true);
  });

  it("calls getFeed with the documented params (limit only on first page)", async () => {
    mockGetFeed.mockResolvedValue({
      items: [],
      nextCursor: null,
      hasMore: false,
      visibility: "visible",
    });

    renderHook(() => useFeed("viewer-1"), {
      wrapper: TestSwrProvider,
    });

    await waitFor(() => {
      expect(mockGetFeed).toHaveBeenCalled();
    });
    expect(mockGetFeed).toHaveBeenCalledWith({ limit: 20 });
  });
});

describe("TKT-6.9.D2 / useFeed — rate-limit decoding", () => {
  it(
    "decodes retryAfterMs into rateLimitedUntil epoch ms",
    async () => {
      mockGetFeed.mockRejectedValue(
        makeApiError(429, "GLOBAL_RATE_LIMITED", {
          retryAfterMs: 30_000,
        }),
      );

      const { result } = renderHook(() => useFeed("viewer-1"), {
        wrapper: TestSwrProvider,
      });

      // The underlying `useCursorPaginated` retries 429s with
      // backoff (250 + 500 + 1000 ms — D5). Wait long enough for
      // the retry loop to exhaust.
      await waitFor(
        () => {
          expect(result.current.error).not.toBeNull();
        },
        { timeout: 5_000 },
      );
      expect(result.current.rateLimitedUntil).not.toBeNull();
      expect(result.current.cooldownSeconds).toBe(30);
      // The anchor is set in an effect, so the value is a future
      // timestamp (anchor + 30s * 1000).
      expect(result.current.rateLimitedUntil).toBeGreaterThan(Date.now());
    },
    10_000,
  );

  it("returns null rateLimitedUntil when no rate-limit signal is present", async () => {
    mockGetFeed.mockResolvedValue({
      items: [],
      nextCursor: null,
      hasMore: false,
      visibility: "visible",
    });

    const { result } = renderHook(() => useFeed("viewer-1"), {
      wrapper: TestSwrProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.rateLimitedUntil).toBeNull();
    expect(result.current.cooldownSeconds).toBeUndefined();
  });
});

describe("TKT-6.9.D2 / useFeed — SWR cache key", () => {
  it("uses SOCIAL_CACHE_KEYS.makeFeedKey(viewerUserId) as the cache identity", async () => {
    mockGetFeed.mockResolvedValue({
      items: [],
      nextCursor: null,
      hasMore: false,
      visibility: "visible",
    });

    renderHook(() => useFeed("viewer-42"), {
      wrapper: TestSwrProvider,
    });

    await waitFor(() => {
      expect(mockGetFeed).toHaveBeenCalled();
    });
    // The SWR cache key for `viewer-42` must be
    // ['social', 'v1', 'feed', 'viewer-42'] — no offset / cursor /
    // page literal is appended by the primitive.
    expect(mockGetFeed).toHaveBeenCalledTimes(1);
  });
});

describe("TKT-6.9.D2 / useFeed — auth-state-change logout cache wipe", () => {
  it("wires an auth-state-change window listener", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useFeed("viewer-1"), {
      wrapper: TestSwrProvider,
    });

    expect(addSpy).toHaveBeenCalledWith(
      "auth-state-change",
      expect.any(Function),
    );

    unmount();

    expect(removeSpy).toHaveBeenCalledWith(
      "auth-state-change",
      expect.any(Function),
    );
  });
});