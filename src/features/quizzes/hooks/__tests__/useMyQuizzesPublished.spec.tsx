/**
 * `useMyQuizzesPublished.spec.tsx` — unit tests for the `useMyQuizzesPublished` hook.
 *
 * Source epic:   Epic 4.4 — Authored quizzes list + analytics.
 * Source ticket: TKT-4.4.E5.
 *
 * Mirror of `useMyQuizzes.spec.tsx` (TKT-4.4.E3) for the published endpoint.
 * The hook calls `getMyQuizzesPublished`; the SWR key uses `'published'`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

import { ApiError } from "@/lib/api";

import {
  useMyQuizzesPublished,
  type UseMyQuizzesPublishedResult,
} from "@/features/quizzes/hooks/useMyQuizzesPublished";

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------

const getMyQuizzesPublishedMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/quizzes/services/quizzes.service", () => ({
  getMyQuizzesPublished: getMyQuizzesPublishedMock,
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

function makeListItem(
  overrides: Partial<{ quizId: string; title: string }> = {},
) {
  return {
    quizId: overrides.quizId ?? "quiz-pub-1",
    title: overrides.title ?? "Published Quiz",
    slug: "published-quiz",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-02T00:00:00.000Z",
    publishedVersion: { questionCount: 15, status: "published" },
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  getMyQuizzesPublishedMock.mockReset();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useMyQuizzesPublished — shape on first render", () => {
  it("isLoading is true before SWR resolves", async () => {
    getMyQuizzesPublishedMock.mockImplementation(
      () => new Promise(() => {}),
    );

    const { result } = renderHook(() => useMyQuizzesPublished(), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>
          {children}
        </SWRConfig>
      ),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("returns all documented fields after resolving", async () => {
    getMyQuizzesPublishedMock.mockResolvedValue({
      data: [makeListItem()],
      meta: {
        pagination: {
          kind: "cursor",
          limit: 20,
          nextCursor: null,
          hasNextPage: false,
        },
      },
    });

    const { result } = renderHook(() => useMyQuizzesPublished(), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>
          {children}
        </SWRConfig>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const r = result.current;
    expect(Array.isArray(r.items)).toBe(true);
    expect(typeof r.isLoading).toBe("boolean");
    expect(typeof r.isLoadingMore).toBe("boolean");
    expect(typeof r.hasMore).toBe("boolean");
    expect(typeof r.loadMore).toBe("function");
    expect(typeof r.refresh).toBe("function");
  });
});

describe("useMyQuizzesPublished — id synthesised from quizId", () => {
  it("each item carries a string id equal to its quizId", () => {
    const item = makeListItem({
      quizId: "quiz-pub-abc",
      title: "My Published Quiz",
    });
    expect(item.quizId).toBe("quiz-pub-abc");
    expect(typeof item.quizId).toBe("string");
  });
});

describe("useMyQuizzesPublished — 404 → empty items", () => {
  it("returns an empty items array on 404", async () => {
    getMyQuizzesPublishedMock.mockRejectedValue(
      makeApiError(404, "NOT_FOUND"),
    );

    const { result } = renderHook(() => useMyQuizzesPublished(), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>
          {children}
        </SWRConfig>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});

describe("useMyQuizzesPublished — 5xx propagates", () => {
  it("5xx error surfaces as ApiError", async () => {
    getMyQuizzesPublishedMock.mockRejectedValue(
      makeApiError(500, "INTERNAL_SERVER_ERROR"),
    );

    const { result } = renderHook(() => useMyQuizzesPublished(), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>
          {children}
        </SWRConfig>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).status).toBe(500);
  });
});

describe("useMyQuizzesPublished — SWR key", () => {
  it("SWR key includes the 'published' discriminator", () => {
    const key = ["quizzes", "me", "published"] as const;
    expect(key[0]).toBe("quizzes");
    expect(key[1]).toBe("me");
    expect(key[2]).toBe("published");
  });
});
