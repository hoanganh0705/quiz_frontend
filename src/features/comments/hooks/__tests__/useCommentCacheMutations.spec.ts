

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import {
applyCommentCreated,
applyCommentEdited,
applyCommentDeleted,
applyCommentHidden,
applyCommentRestored,
applyVoteCast,
applyVoteRemoved,
useCommentCacheMutations,
} from "@/features/comments/hooks/useCommentCacheMutations";
import type {
CommentCreatedPayload,
CommentEditedPayload,
CommentDeletedPayload,
CommentHiddenPayload,
CommentRestoredPayload,
VoteCastPayload,
VoteRemovedPayload,
} from "@/lib/realtime/events";

const QUIZ_ID = "0192f4d8-3333-7000-8000-000000000001";
const USER_ID = "0192f4d8-cccc-7000-8000-00000000000d";
const OTHER_USER_ID = "0192f4d8-eeee-7000-8000-000000000099";

beforeEach(() => {
vi.clearAllMocks();
});

afterEach(() => {
vi.restoreAllMocks();
});

describe("applyCommentCreated", () => {
it("does nothing when snapshot is missing", () => {
const payload: CommentCreatedPayload = {
eventType: "comment_created",
commentId: "c-1",
quizId: QUIZ_ID,
parentCommentId: null,
authorId: OTHER_USER_ID,
authorUsername: "other",
isReply: false,
timestamp: new Date().toISOString(),
      // snapshot intentionally omitted
    };

expect(() => applyCommentCreated(payload, USER_ID)).not.toThrow();
  });

it("is a no-op when no matching cache exists", () => {
const payload: CommentCreatedPayload = {
eventType: "comment_created",
commentId: "c-1",
quizId: QUIZ_ID,
parentCommentId: null,
authorId: OTHER_USER_ID,
authorUsername: "other",
isReply: false,
timestamp: new Date().toISOString(),
snapshot: {
id: "c-1",
quizId: QUIZ_ID,
parentCommentId: null,
authorId: OTHER_USER_ID,
authorUsername: "other",
authorDisplayName: "Other User",
authorAvatarUrl: null,
body: "Test",
isHidden: false,
votesCount: 0,
upvotesCount: 0,
downvotesCount: 0,
repliesCount: 0,
userVote: null,
createdAt: new Date().toISOString(),
updatedAt: new Date().toISOString(),
deletedAt: null,
isReply: false,
      },
    };

expect(() => applyCommentCreated(payload, USER_ID)).not.toThrow();
  });

it("is a no-op for replies (replies require parent thread context)", () => {
const payload: CommentCreatedPayload = {
eventType: "comment_created",
commentId: "c-reply-1",
quizId: QUIZ_ID,
parentCommentId: "c-parent",
authorId: OTHER_USER_ID,
authorUsername: "other",
isReply: true,
timestamp: new Date().toISOString(),
snapshot: {
id: "c-reply-1",
quizId: QUIZ_ID,
parentCommentId: "c-parent",
authorId: OTHER_USER_ID,
authorUsername: "other",
authorDisplayName: "Other User",
authorAvatarUrl: null,
body: "Reply test",
isHidden: false,
votesCount: 0,
upvotesCount: 0,
downvotesCount: 0,
repliesCount: 0,
userVote: null,
createdAt: new Date().toISOString(),
updatedAt: new Date().toISOString(),
deletedAt: null,
isReply: true,
      },
    };

expect(() => applyCommentCreated(payload, USER_ID)).not.toThrow();
  });
});

describe("applyCommentEdited", () => {
it("does nothing when snapshot is missing", () => {
const payload: CommentEditedPayload = {
eventType: "comment_edited",
commentId: "c-1",
quizId: QUIZ_ID,
authorId: OTHER_USER_ID,
timestamp: new Date().toISOString(),
    };

expect(() => applyCommentEdited(payload, USER_ID)).not.toThrow();
  });
});

describe("applyCommentDeleted", () => {
it("does not throw when no matching cache exists", () => {
const payload: CommentDeletedPayload = {
eventType: "comment_deleted",
commentId: "c-1",
quizId: QUIZ_ID,
authorId: OTHER_USER_ID,
timestamp: new Date().toISOString(),
parentCommentId: null,
    };

expect(() => applyCommentDeleted(payload, USER_ID)).not.toThrow();
  });

it("accepts reply deletion payloads", () => {
const payload: CommentDeletedPayload = {
eventType: "comment_deleted",
commentId: "c-reply-1",
quizId: QUIZ_ID,
authorId: OTHER_USER_ID,
timestamp: new Date().toISOString(),
parentCommentId: "c-parent",
    };

expect(() => applyCommentDeleted(payload, USER_ID)).not.toThrow();
  });
});

describe("applyCommentHidden", () => {
it("does nothing when snapshot is missing", () => {
const payload: CommentHiddenPayload = {
eventType: "comment_hidden",
commentId: "c-1",
quizId: QUIZ_ID,
moderatorId: "mod-1",
timestamp: new Date().toISOString(),
    };

expect(() => applyCommentHidden(payload, USER_ID)).not.toThrow();
  });
});

describe("applyCommentRestored", () => {
it("does nothing when snapshot is missing", () => {
const payload: CommentRestoredPayload = {
eventType: "comment_restored",
commentId: "c-1",
quizId: QUIZ_ID,
moderatorId: "mod-1",
timestamp: new Date().toISOString(),
    };

expect(() => applyCommentRestored(payload, USER_ID)).not.toThrow();
  });
});

describe("applyVoteCast", () => {
it("does not throw when no matching cache exists", () => {
const payload: VoteCastPayload = {
eventType: "vote_cast",
commentId: "c-1",
quizId: QUIZ_ID,
voterId: OTHER_USER_ID,
value: "upvote",
timestamp: new Date().toISOString(),
votesCount: 1,
upvotesCount: 1,
downvotesCount: 0,
    };

expect(() => applyVoteCast(payload, USER_ID)).not.toThrow();
  });

it("handles downvote payloads", () => {
const payload: VoteCastPayload = {
eventType: "vote_cast",
commentId: "c-1",
quizId: QUIZ_ID,
voterId: OTHER_USER_ID,
value: "downvote",
timestamp: new Date().toISOString(),
votesCount: -1,
upvotesCount: 0,
downvotesCount: 1,
    };

expect(() => applyVoteCast(payload, USER_ID)).not.toThrow();
  });
});

describe("applyVoteRemoved", () => {
it("does not throw when no matching cache exists", () => {
const payload: VoteRemovedPayload = {
eventType: "vote_removed",
commentId: "c-1",
quizId: QUIZ_ID,
voterId: OTHER_USER_ID,
timestamp: new Date().toISOString(),
votesCount: 0,
upvotesCount: 0,
downvotesCount: 0,
    };

expect(() => applyVoteRemoved(payload, USER_ID)).not.toThrow();
  });
});

describe("useCommentCacheMutations", () => {
it("returns register functions for all operation types", () => {
const { result } = renderHook(() => useCommentCacheMutations());

expect(typeof result.current.registerCreate).toBe("function");
expect(typeof result.current.registerEdit).toBe("function");
expect(typeof result.current.registerDelete).toBe("function");
expect(typeof result.current.registerVote).toBe("function");
expect(typeof result.current.registerUnvote).toBe("function");
expect(typeof result.current.registerHide).toBe("function");
expect(typeof result.current.registerRestore).toBe("function");
  });

it("register functions do not throw when called", () => {
const { result } = renderHook(() => useCommentCacheMutations());

expect(() => result.current.registerCreate("c-1")).not.toThrow();
expect(() => result.current.registerEdit("c-1")).not.toThrow();
expect(() => result.current.registerDelete("c-1")).not.toThrow();
expect(() => result.current.registerVote("c-1")).not.toThrow();
expect(() => result.current.registerUnvote("c-1")).not.toThrow();
expect(() => result.current.registerHide("c-1")).not.toThrow();
expect(() => result.current.registerRestore("c-1")).not.toThrow();
  });
});
