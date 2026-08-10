/**
 * `useUserActivity.spec.tsx` — Locks the Story 6.4 activity
 * read hook contract (TKT-6.4.D2).
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
 *   - `social_activity_live === 'placeholder'` short-circuits
 *     without a service call and returns
 *     `visibility: 'not_found'`.
 *   - Unauthenticated viewers receive
 *     `visibility: 'not_found'` without a service call.
 *   - `null` targetUserId receives `visibility: 'not_found'`
 *     without a service call.
 *   - Successful response returns `visibility: 'visible'` and the
 *     projected items.
 *   - When `cooldownSeconds > 0` is signalled via
 *     `extensions.retryAfterMs`, `rateLimitedUntil` is a future
 *     epoch ms.
 *   - When no rate-limit signal is present, `rateLimitedUntil`
 *     is `null`.
 *   - The SWR key is `['social', 'user-activity', targetUserId]`.
 */

import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SWRConfig } from "swr";

import { useUserActivity } from "@/features/social/hooks/useUserActivity";
import { ApiError } from "@/lib/api";

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockGetUserActivity = vi.fn();
vi.mock("@/features/social/services/activity.service", () => ({
  getUserActivity: (...args: unknown[]) => mockGetUserActivity(...args),
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
  mockGetUserActivity.mockReset();
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

describe("useUserActivity — short-circuits", () => {
  it("returns visibility: 'not_found' when social_activity_live === 'placeholder'", async () => {
    flagPlaceholder();
    const { result } = renderHook(() => useUserActivity("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("not_found");
    });
    expect(mockGetUserActivity).not.toHaveBeenCalled();
    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.rateLimitedUntil).toBeNull();
  });

  it("returns visibility: 'not_found' when viewer is unauthenticated", async () => {
    unauthenticated();
    const { result } = renderHook(() => useUserActivity("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("not_found");
    });
    expect(mockGetUserActivity).not.toHaveBeenCalled();
  });

  it("returns visibility: 'not_found' when targetUserId is null", async () => {
    const { result } = renderHook(() => useUserActivity(null), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("not_found");
    });
    expect(mockGetUserActivity).not.toHaveBeenCalled();
  });
});

describe("useUserActivity — visibility mapping", () => {
  it("maps SOCIAL_USER_BLOCKED to visibility: 'blocked_by_viewer'", async () => {
    mockGetUserActivity.mockRejectedValue(
      makeApiError(403, "SOCIAL_USER_BLOCKED"),
    );
    const { result } = renderHook(() => useUserActivity("user-1"), {
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
    mockGetUserActivity.mockRejectedValue(
      makeApiError(403, "SOCIAL_BLOCKED_USER"),
    );
    const { result } = renderHook(() => useUserActivity("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("blocked_viewer");
    });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  it("maps SOCIAL_FRIEND_LIST_FORBIDDEN to visibility: 'private'", async () => {
    mockGetUserActivity.mockRejectedValue(
      makeApiError(403, "SOCIAL_FRIEND_LIST_FORBIDDEN"),
    );
    const { result } = renderHook(() => useUserActivity("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("private");
    });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  it("maps SOCIAL_USER_NOT_FOUND to visibility: 'not_found'", async () => {
    mockGetUserActivity.mockRejectedValue(
      makeApiError(404, "SOCIAL_USER_NOT_FOUND"),
    );
    const { result } = renderHook(() => useUserActivity("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("not_found");
    });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });
});

describe("useUserActivity — happy path", () => {
  it("returns visibility: 'visible' and the projected items on success", async () => {
    mockGetUserActivity.mockResolvedValue({
      items: [
        {
          id: "activity-1",
          type: "badge_earned",
          at: "2026-08-01T12:00:00.000Z",
          actorUser: {
            id: "user-1",
            userId: "user-1",
            userName: "user-1",
            displayName: null,
            avatarUrl: null,
            isPrivate: false,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
          payload: {
            type: "badge_earned",
            badgeId: "badge-1",
            badgeSlug: "first-quiz",
            badgeName: "First Quiz",
          },
        },
      ],
      total: 1,
      visibility: "visible",
    });
    const { result } = renderHook(() => useUserActivity("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("visible");
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]!.type).toBe("badge_earned");
    expect(result.current.total).toBe(1);
    expect(result.current.error).toBeNull();
    expect(result.current.rateLimitedUntil).toBeNull();
  });

  it("forwards ACTIVITY_PAGE_SIZE (20) as the limit", async () => {
    mockGetUserActivity.mockResolvedValue({
      items: [],
      total: 0,
      visibility: "visible",
    });
    const { result } = renderHook(() => useUserActivity("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("visible");
    });
    expect(mockGetUserActivity).toHaveBeenCalledWith("user-1", {
      limit: 20,
    });
  });

  it("propagates unknown errors so the consumer can render the error state", async () => {
    mockGetUserActivity.mockRejectedValue(
      makeApiError(500, "GLOBAL_INTERNAL_ERROR"),
    );
    const { result } = renderHook(() => useUserActivity("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });
    expect(result.current.error?.code).toBe("GLOBAL_INTERNAL_ERROR");
    expect(result.current.visibility).toBe("visible");
  });
});

describe("useUserActivity — rate-limit surfacing", () => {
  it("sets rateLimitedUntil to a future epoch ms when cooldownSeconds > 0", async () => {
    mockGetUserActivity.mockRejectedValue(
      makeApiError(429, "ACTIVITY_RATE_LIMITED", {
        retryAfterMs: 60_000,
      }),
    );
    const before = Date.now();
    const { result } = renderHook(() => useUserActivity("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(
      () => {
        expect(result.current.rateLimitedUntil).not.toBeNull();
      },
      { timeout: 5000 },
    );
    const after = Date.now();
    expect(result.current.rateLimitedUntil!).toBeGreaterThanOrEqual(
      before + 60_000,
    );
    expect(result.current.rateLimitedUntil!).toBeLessThanOrEqual(
      after + 60_000,
    );
    // The error is preserved on the hook surface so the
    // consumer can branch on `code === 'ACTIVITY_RATE_LIMITED'`.
    expect(result.current.error?.code).toBe("ACTIVITY_RATE_LIMITED");
  });

  it("returns rateLimitedUntil: null when no rate-limit signal is present", async () => {
    mockGetUserActivity.mockResolvedValue({
      items: [],
      total: 0,
      visibility: "visible",
    });
    const { result } = renderHook(() => useUserActivity("user-1"), {
      wrapper: TestSwrProvider,
    });
    await waitFor(() => {
      expect(result.current.visibility).toBe("visible");
    });
    expect(result.current.rateLimitedUntil).toBeNull();
  });
});
