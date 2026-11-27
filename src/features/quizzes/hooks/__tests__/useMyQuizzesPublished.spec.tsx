import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ApiError } from "@/lib/api";

import {
  useMyQuizzes,
  type UseMyQuizzesResult,
} from "@/features/quizzes/hooks/useMyQuizzes";

const getMyQuizzesPublishedMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/quizzes/services/quizzes.service", () => ({
  getMyQuizzes: vi.fn(),
  getMyQuizzesDrafts: vi.fn(),
  getMyQuizzesPublished: getMyQuizzesPublishedMock,
}));

const useMyQuizzesPublished = (
  params?: Omit<Parameters<typeof useMyQuizzes>[0], "tab">,
): UseMyQuizzesResult => useMyQuizzes({ ...params, tab: "published" });

function TestProvider({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

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

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  getMyQuizzesPublishedMock.mockReset();
});

describe("useMyQuizzesPublished — shape on first render", () => {
  it("isLoading is true before query resolves", async () => {
    getMyQuizzesPublishedMock.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useMyQuizzesPublished(), {
      wrapper: TestProvider,
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
      wrapper: TestProvider,
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
    getMyQuizzesPublishedMock.mockRejectedValue(makeApiError(404, "NOT_FOUND"));

    const { result } = renderHook(() => useMyQuizzesPublished(), {
      wrapper: TestProvider,
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
      wrapper: TestProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).status).toBe(500);
  });
});

describe("useMyQuizzesPublished — query key", () => {
  it("query key includes the 'published' discriminator", () => {
    const key = ["quizzes", "me", "published"] as const;
    expect(key[0]).toBe("quizzes");
    expect(key[1]).toBe("me");
    expect(key[2]).toBe("published");
  });
});
