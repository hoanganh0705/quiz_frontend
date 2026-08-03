/**
 * `useMyQuizzesAnalytics.spec.tsx` — unit tests for the `useMyQuizzesAnalytics` hook.
 *
 * Source epic:   Epic 4.4 — Authored quizzes list + analytics.
 * Source ticket: TKT-4.4.E6.
 *
 * Four cases per the ticket's testing checklist:
 *
 *   (1) `analytics` is `null` while loading.
 *   (2) `analytics` is populated on success.
 *   (3) `analytics` is `null` when the backend returns 404.
 *   (4) 5xx propagates as `ApiError` (not swallowed).
 *
 * The service is mocked so this tests the hook integration, not the SDK.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

import { ApiError } from "@/lib/api";

import { useMyQuizzesAnalytics } from "@/features/quizzes/hooks/useMyQuizzesAnalytics";

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------

const getMyQuizAnalyticsMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/quizzes/services/quizzes.service", () => ({
  getMyQuizAnalytics: getMyQuizAnalyticsMock,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeApiError(status: number, code = `CODE_${status}`): ApiError {
  return new ApiError({
    isAxiosError: true,
    name: "AxiosError",
    message: `Mock ${status}`,
    code,
    config: undefined,
    request: undefined,
    response: {
      status,
      data: { code, detail: "fixture" },
    },
  });
}

function makeAnalytics(
  overrides: Partial<{
    totalAttempts: number;
    totalReviews: number;
    averageRating: number;
    publishedQuizzes: number;
  }> = {},
) {
  return {
    userId: "user-1",
    totalQuizzes: 5,
    draftQuizzes: 2,
    publishedQuizzes: overrides.publishedQuizzes ?? 3,
    totalAttempts: overrides.totalAttempts ?? 150,
    uniquePlayers: 80,
    averageScore: 72,
    averageRating: overrides.averageRating ?? 4.2,
    totalBookmarks: 30,
    totalReviews: overrides.totalReviews ?? 20,
    lastUpdated: "2025-01-15T00:00:00.000Z",
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  getMyQuizAnalyticsMock.mockReset();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useMyQuizzesAnalytics — analytics null while loading", () => {
  it("analytics is null before SWR resolves", async () => {
    getMyQuizAnalyticsMock.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useMyQuizzesAnalytics(), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>
          {children}
        </SWRConfig>
      ),
    });

    expect(result.current.analytics).toBeNull();
  });
});

describe("useMyQuizzesAnalytics — analytics populated on success", () => {
  it("analytics is returned with correct fields after resolving", async () => {
    const fixture = makeAnalytics({ totalAttempts: 100, averageRating: 4.5 });
    getMyQuizAnalyticsMock.mockResolvedValue({ data: fixture });

    const { result } = renderHook(() => useMyQuizzesAnalytics(), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>
          {children}
        </SWRConfig>
      ),
    });

    await waitFor(() => {
      expect(result.current.analytics).not.toBeNull();
    });

    expect(result.current.analytics!.totalAttempts).toBe(100);
    expect(result.current.analytics!.averageRating).toBe(4.5);
    // SWR may return `undefined` for `error` when there is no error.
    expect(result.current.error ?? null).toBeNull();
  });
});

describe("useMyQuizzesAnalytics — 404 → analytics null", () => {
  it("analytics is null on 404 (enables 'No activity yet' empty state)", async () => {
    getMyQuizAnalyticsMock.mockRejectedValue(
      makeApiError(404, "NOT_FOUND"),
    );

    const { result } = renderHook(() => useMyQuizzesAnalytics(), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>
          {children}
        </SWRConfig>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // 404 is caught in the hook and normalised to null.
    expect(result.current.analytics).toBeNull();
    // SWR may return `undefined` for `error` when there is no error.
    // The hook normalises 404 → null but otherwise passes through the SWR value.
    expect(result.current.error ?? null).toBeNull();
  });
});

describe("useMyQuizzesAnalytics — 5xx propagates", () => {
  it("5xx error is not swallowed — it propagates as ApiError", async () => {
    getMyQuizAnalyticsMock.mockRejectedValue(
      makeApiError(500, "INTERNAL_SERVER_ERROR"),
    );

    const { result } = renderHook(() => useMyQuizzesAnalytics(), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>
          {children}
        </SWRConfig>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // 5xx errors are NOT caught — they propagate as ApiError.
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).status).toBe(500);
  });
});
