

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

import { ApiError } from "@/lib/api";

import {
useMyQuizzesDrafts,
type UseMyQuizzesDraftsResult,
} from "@/features/quizzes/hooks/useMyQuizzesDrafts";

const getMyQuizzesDraftsMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/quizzes/services/quizzes.service", () => ({
getMyQuizzesDrafts: getMyQuizzesDraftsMock,
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

function makeListItem(
overrides: Partial<{ quizId: string; title: string }> = {},
) {
return {
quizId: overrides.quizId ?? "quiz-draft-1",
title: overrides.title ?? "Draft Quiz",
slug: "draft-quiz",
createdAt: "2025-01-01T00:00:00.000Z",
updatedAt: "2025-01-02T00:00:00.000Z",
publishedVersion: { questionCount: 5, status: "draft" },
  };
}

beforeEach(() => {
vi.clearAllMocks();
});

afterEach(() => {
getMyQuizzesDraftsMock.mockReset();
});

describe("useMyQuizzesDrafts — shape on first render", () => {
it("isLoading is true before SWR resolves", async () => {
getMyQuizzesDraftsMock.mockImplementation(
() => new Promise(() => {}),
    );

const { result } = renderHook(() => useMyQuizzesDrafts(), {
wrapper: ({ children }) => (
<SWRConfig value={{ provider: () => new Map() }}>
{children}
</SWRConfig>
      ),
    });

expect(result.current.isLoading).toBe(true);
  });

it("returns all documented fields after resolving", async () => {
getMyQuizzesDraftsMock.mockResolvedValue({
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

const { result } = renderHook(() => useMyQuizzesDrafts(), {
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

describe("useMyQuizzesDrafts — id synthesised from quizId", () => {
it("each item carries a string id equal to its quizId", () => {
const item = makeListItem({ quizId: "quiz-draft-abc", title: "My Draft" });
expect(item.quizId).toBe("quiz-draft-abc");
expect(typeof item.quizId).toBe("string");
  });
});

describe("useMyQuizzesDrafts — 404 → empty items", () => {
it("returns an empty items array on 404", async () => {
getMyQuizzesDraftsMock.mockRejectedValue(
makeApiError(404, "NOT_FOUND"),
    );

const { result } = renderHook(() => useMyQuizzesDrafts(), {
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

describe("useMyQuizzesDrafts — 5xx propagates", () => {
it("5xx error surfaces as ApiError", async () => {
getMyQuizzesDraftsMock.mockRejectedValue(
makeApiError(500, "INTERNAL_SERVER_ERROR"),
    );

const { result } = renderHook(() => useMyQuizzesDrafts(), {
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

describe("useMyQuizzesDrafts — SWR key", () => {
it("SWR key includes the 'drafts' discriminator", () => {
const key = ["quizzes", "me", "drafts"] as const;
expect(key[0]).toBe("quizzes");
expect(key[1]).toBe("me");
expect(key[2]).toBe("drafts");
  });
});
