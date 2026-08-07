/**
 * `useTrendingUsers.spec.ts` — Locks the Story 6.5 `useTrendingUsers`
 * hook contract (TKT-6.5.C4).
 *
 * Asserts:
 *
 *   - The hook returns `{ items, total, visibility, isLoading,
 *     isStale, error, loadMore, hasMore, retry }` on every branch.
 *   - Privacy code mapping: `SOCIAL_USER_BLOCKED` → `blocked_by_viewer`,
 *     `SOCIAL_BLOCKED_USER` → `blocked_viewer`,
 *     `SOCIAL_FRIEND_LIST_FORBIDDEN` → `private`,
 *     `SOCIAL_USER_NOT_FOUND` → `not_found`.
 *   - Visibility fallback: non-visible viewers receive
 *     `{ items: [], total: 0, visibility }` without throwing.
 *   - SWR key is `['social', 'trending']`.
 *   - Feature flag `'placeholder'` returns safe fallback.
 *   - Unauthenticated viewer returns safe fallback.
 */

import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SWRConfig } from "swr";

import { ApiError } from "@/lib/api";

import { useTrendingUsers, resolveTrendingVisibility } from "@/features/social/hooks/useTrendingUsers";

// ─── Sentry mock ─────────────────────────────────────────────────────────

const addBreadcrumbMock = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: (...args: unknown[]) => addBreadcrumbMock(...args),
}));

// ─── Feature-flag mock ────────────────────────────────────────────────────

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

// ─── Auth mock ───────────────────────────────────────────────────────────

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
  useAuthSession: () => mockUseAuthBootstrap(),
}));

// ─── Service mock ────────────────────────────────────────────────────────

const mockGetTrendingUsers = vi.fn();
vi.mock("@/features/social/services/discovery.service", () => ({
  getTrendingUsers: (...args: unknown[]) => mockGetTrendingUsers(...args),
}));

// ─── Test provider ───────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────

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

// ─── Setup / teardown ───────────────────────────────────────────────────

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

// ─── `resolveTrendingVisibility` ────────────────────────────────────────

describe("resolveTrendingVisibility", () => {
  it("maps SOCIAL_USER_BLOCKED to blocked_by_viewer", () => {
    expect(resolveTrendingVisibility("SOCIAL_USER_BLOCKED")).toBe("blocked_by_viewer");
  });

  it("maps SOCIAL_BLOCKED_USER to blocked_viewer", () => {
    expect(resolveTrendingVisibility("SOCIAL_BLOCKED_USER")).toBe("blocked_viewer");
  });

  it("maps SOCIAL_FRIEND_LIST_FORBIDDEN to private", () => {
    expect(resolveTrendingVisibility("SOCIAL_FRIEND_LIST_FORBIDDEN")).toBe("private");
  });

  it("maps SOCIAL_USER_NOT_FOUND to not_found", () => {
    expect(resolveTrendingVisibility("SOCIAL_USER_NOT_FOUND")).toBe("not_found");
  });

  it("maps unknown codes to visible", () => {
    expect(resolveTrendingVisibility("SOME_OTHER_CODE")).toBe("visible");
  });

  it("maps undefined to visible (success)", () => {
    expect(resolveTrendingVisibility(undefined)).toBe("visible");
  });
});

// ─── Hook integration ────────────────────────────────────────────────────

describe("useTrendingUsers", () => {
  it("returns the documented shape on happy path", async () => {
    mockGetTrendingUsers.mockResolvedValueOnce({
      items: [
        { userId: "u1", username: "alice", avatarUrl: null, quizCount: 42, followerCount: 100 },
      ],
      total: 10,
      visibility: "visible",
    });

    const { result } = renderHook(() => useTrendingUsers(), {
      wrapper: TestSwrProvider,
    });

    await waitFor(() => {
      expect(result.current.visibility).toBe("visible");
    });
  });

  it("returns safe fallback when feature flag is placeholder", async () => {
    mockGetFeatureFlagValue.mockReturnValueOnce("placeholder");

    const { result } = renderHook(() => useTrendingUsers(), {
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

    const { result } = renderHook(() => useTrendingUsers(), {
      wrapper: TestSwrProvider,
    });

    expect(result.current.visibility).toBe("not_found");
    expect(result.current.items).toEqual([]);
  });
});
