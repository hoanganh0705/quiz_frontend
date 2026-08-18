

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

import { ApiError } from "@/lib/api";

import { useQuizComments } from "@/features/comments/hooks/useQuizComments";
import {
REPLY_DEFAULT_LIMIT,
TOP_LEVEL_DEFAULT_LIMIT,
commentsKey,
} from "@/features/comments/types";

const listQuizCommentsMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/comments/services/comments.service", () => ({
listQuizComments: listQuizCommentsMock,
}));

function makeApiError(
status: number,
code = `CODE_${status}`,
message = `Mock ${status}`,
): ApiError {
return new ApiError({
isAxiosError: true,
name: "AxiosError",
message,
code,
config: undefined,
request: undefined,
response: {
status,
statusText: message,
data: {
type: "https://api.quiz.local/problems/x",
title: message,
status,
detail: message,
extensions: { code, requestId: "req-test" },
      },
headers: {},
config: undefined as never,
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

function makeThread(
id: string,
overrides: Partial<{ repliesCount: number; parentCommentId: string | null }> = {},
) {
return {
id,
quizId: "quiz-1",
authorId: "author-1",
author: {
id: "author-1",
username: "tester",
displayName: "Tester",
avatarUrl: null,
    },
parentCommentId: overrides.parentCommentId ?? null,
body: `body of ${id}`,
isHidden: false,
hiddenById: null,
hiddenAt: null,
votesCount: 0,
upvotesCount: 0,
downvotesCount: 0,
repliesCount: overrides.repliesCount ?? 0,
createdAt: "2026-08-01T00:00:00.000Z",
updatedAt: "2026-08-01T00:00:00.000Z",
deletedAt: null,
replies: [],
userVote: null,
  };
}

function mockPageResponse(
items: ReturnType<typeof makeThread>[],
opts: { nextCursor?: string | null; hasNextPage?: boolean } = {},
) {
return {
data: items,
meta: {
pagination: {
kind: "cursor",
limit: items.length,
nextCursor: opts.nextCursor ?? null,
hasNextPage: opts.hasNextPage ?? false,
      },
    },
  };
}

function makeWrapper() {

return ({ children }: { children: React.ReactNode }) => (
<SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
  );
}

beforeEach(() => {
vi.clearAllMocks();
});

afterEach(() => {
listQuizCommentsMock.mockReset();
});

describe("useQuizComments — top-level mode", () => {
it("calls listQuizComments without parentId and uses TOP_LEVEL_DEFAULT_LIMIT", async () => {
listQuizCommentsMock.mockResolvedValue(mockPageResponse([makeThread("c1")]));

const { result } = renderHook(
() => useQuizComments({ quizId: "quiz-1" }),
{ wrapper: makeWrapper() },
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(listQuizCommentsMock).toHaveBeenCalledWith("quiz-1", {
cursor: undefined,
limit: TOP_LEVEL_DEFAULT_LIMIT,
parentId: undefined,
    });
  });

it("returns items with the id alias after success", async () => {
listQuizCommentsMock.mockResolvedValue(
mockPageResponse([makeThread("c1"), makeThread("c2")]),
    );

const { result } = renderHook(
() => useQuizComments({ quizId: "quiz-1" }),
{ wrapper: makeWrapper() },
    );

await waitFor(() => {
expect(result.current.items.length).toBe(2);
    });

expect(result.current.items[0]!.id).toBe("c1");
expect(result.current.items[1]!.id).toBe("c2");
  });

it("exposes hasMore=true when the server reports hasNextPage", async () => {
listQuizCommentsMock.mockResolvedValue(
mockPageResponse([makeThread("c1")], { hasNextPage: true, nextCursor: "abc" }),
    );

const { result } = renderHook(
() => useQuizComments({ quizId: "quiz-1" }),
{ wrapper: makeWrapper() },
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(result.current.hasMore).toBe(true);
  });
});

describe("useQuizComments — reply mode", () => {
it("calls listQuizComments with parentId set and uses REPLY_DEFAULT_LIMIT", async () => {
listQuizCommentsMock.mockResolvedValue(mockPageResponse([makeThread("r1")]));

const { result } = renderHook(
() =>
useQuizComments({
quizId: "quiz-1",
filters: { parentId: "c1" },
        }),
{ wrapper: makeWrapper() },
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(listQuizCommentsMock).toHaveBeenCalledWith("quiz-1", {
cursor: undefined,
limit: REPLY_DEFAULT_LIMIT,
parentId: "c1",
    });
  });
});

describe("useQuizComments — disabled state", () => {
it("does not fetch when quizId is null", async () => {
const { result } = renderHook(
() => useQuizComments({ quizId: null }),
{ wrapper: makeWrapper() },
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(listQuizCommentsMock).not.toHaveBeenCalled();
expect(result.current.items).toEqual([]);
expect(result.current.error).toBeNull();
  });
});

describe("useQuizComments — error propagation", () => {
it("5xx surfaces as ApiError on result.error", async () => {
listQuizCommentsMock.mockRejectedValue(
makeApiError(500, "GLOBAL_INTERNAL_ERROR"),
    );

const { result } = renderHook(
() => useQuizComments({ quizId: "quiz-1" }),
{ wrapper: makeWrapper() },
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(result.current.error).toBeInstanceOf(ApiError);
expect((result.current.error as ApiError).status).toBe(500);
  });

it("404 surfaces as ApiError (caller decides how to render)", async () => {
listQuizCommentsMock.mockRejectedValue(
makeApiError(404, "COMMENT_QUIZ_NOT_FOUND"),
    );

const { result } = renderHook(
() => useQuizComments({ quizId: "quiz-1" }),
{ wrapper: makeWrapper() },
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(result.current.error).toBeInstanceOf(ApiError);
expect((result.current.error as ApiError).code).toBe("COMMENT_QUIZ_NOT_FOUND");
  });
});

describe("useQuizComments — cursor pass-through", () => {
it("forwards the explicit cursor filter to the service", async () => {
listQuizCommentsMock.mockResolvedValue(mockPageResponse([]));

const { result } = renderHook(
() =>
useQuizComments({
quizId: "quiz-1",
filters: { cursor: "page-2-cursor", limit: 5 },
        }),
{ wrapper: makeWrapper() },
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(listQuizCommentsMock).toHaveBeenCalledWith("quiz-1", {
cursor: "page-2-cursor",
limit: 5,
parentId: undefined,
    });
  });
});

describe("commentsKey — SWR key factory", () => {
it("starts with 'comments' and embeds the quiz id", () => {
const key = commentsKey("quiz-1");
expect(key[0]).toBe("comments");
expect(key[1]).toBe("quiz-1");
  });

it("embeds parentId, cursor, limit when filters are passed", () => {
const key = commentsKey("quiz-1", {
parentId: "c1",
cursor: "p2",
limit: 50,
    });
expect(key[2]).toEqual(["c1", "p2", 50]);
  });

it("produces stable keys for semantically-equivalent filters", () => {
const k1 = commentsKey("quiz-1", { parentId: undefined });
const k2 = commentsKey("quiz-1");
expect(k2[2]).toEqual(k1[2]);
  });
});
