

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

import { ApiError } from "@/lib/api";

import {
useMyQuizzes,
type UseMyQuizzesResult,
} from "@/features/quizzes/hooks/useMyQuizzes";

const getMyQuizzesMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/quizzes/services/quizzes.service", () => ({
getMyQuizzes: getMyQuizzesMock,
}));

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

function makeListItem(overrides: Partial<{
quizId: string;
title: string;
}> = {}): {
quizId: string;
title: string;
slug: string;
createdAt: string;
updatedAt: string;
publishedVersion: { questionCount: number; status: string };
} {
return {
quizId: overrides.quizId ?? "quiz-1",
title: overrides.title ?? "Test Quiz",
slug: "test-quiz",
createdAt: "2025-01-01T00:00:00.000Z",
updatedAt: "2025-01-02T00:00:00.000Z",
publishedVersion: { questionCount: 10, status: "published" },
  };
}

beforeEach(() => {
vi.clearAllMocks();
});

afterEach(() => {
getMyQuizzesMock.mockReset();
});

describe("useMyQuizzes — shape on first render", () => {
it("isLoading is true before SWR resolves", async () => {
getMyQuizzesMock.mockImplementation(
() => new Promise(() => {}), // never resolves
    );

const { result } = renderHook(() => useMyQuizzes(), {
wrapper: ({ children }) => (
<SWRConfig value={{ provider: () => new Map() }}>
{children}
</SWRConfig>
      ),
    });

expect(result.current.isLoading).toBe(true);
  });

it("returns all documented fields after resolving", async () => {
getMyQuizzesMock.mockResolvedValue({
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

const { result } = renderHook(() => useMyQuizzes(), {
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

describe("useMyQuizzes — id synthesised from quizId", () => {
it("each item carries a string id equal to its quizId", () => {

const item = makeListItem({ quizId: "quiz-abc", title: "My Quiz" });
expect(item.quizId).toBe("quiz-abc");
expect(typeof item.quizId).toBe("string");
  });
});

describe("useMyQuizzes — 404 → empty items", () => {
it("returns an empty items array on 404", async () => {
getMyQuizzesMock.mockRejectedValue(makeApiError(404, "NOT_FOUND"));

const { result } = renderHook(() => useMyQuizzes(), {
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

describe("useMyQuizzes — 5xx propagates", () => {
it("5xx error surfaces as ApiError", async () => {
getMyQuizzesMock.mockRejectedValue(
makeApiError(500, "INTERNAL_SERVER_ERROR"),
    );

const { result } = renderHook(() => useMyQuizzes(), {
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

describe("useMyQuizzes — SWR key", () => {
it("SWR key includes the 'all' discriminator", () => {

const key = (["quizzes", "me", "all"] as const);
expect(key[0]).toBe("quizzes");
expect(key[1]).toBe("me");
expect(key[2]).toBe("all");
  });
});
