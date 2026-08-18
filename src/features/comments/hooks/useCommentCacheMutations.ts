

"use client";

import { useCallback } from "react";
import { mutate as globalMutate } from "swr";

import type {
CommentSnapshot,
CommentCreatedPayload,
CommentEditedPayload,
CommentDeletedPayload,
CommentHiddenPayload,
CommentRestoredPayload,
VoteCastPayload,
VoteRemovedPayload,
} from "@/lib/realtime/events";
import type { CommentThreadItem, CommentUserVote } from "@/features/comments/types";

interface PendingOperation {
type: "create" | "edit" | "delete" | "vote" | "unvote" | "hide" | "restore";
commentId: string;
timestamp: number;
}

interface CommentCacheEntry {
items?: CommentThreadItem[];
hasNextPage?: boolean;

nextPageMarker?: string | null;
}

const pendingOperations = new Map<string, PendingOperation>();

const PENDING_OPERATION_TTL_MS = 30_000;

setInterval(() => {
const now = Date.now();
for (const [key, op] of pendingOperations.entries()) {
if (now - op.timestamp > PENDING_OPERATION_TTL_MS) {
pendingOperations.delete(key);
    }
  }
}, 10_000);

function pendingOpKey(
type: PendingOperation["type"],
commentId: string,
userId?: string,
): string {
return `${type}:${commentId}:${userId ?? "anon"}`;
}

function isOperationPending(
type: PendingOperation["type"],
commentId: string,
userId?: string,
): boolean {
const key = pendingOpKey(type, commentId, userId);
const op = pendingOperations.get(key);
if (!op) return false;
return Date.now() - op.timestamp < PENDING_OPERATION_TTL_MS;
}

function registerPending(
type: PendingOperation["type"],
commentId: string,
userId?: string,
): void {
const key = pendingOpKey(type, commentId, userId);
pendingOperations.set(key, { type, commentId, timestamp: Date.now() });
}

function clearPending(
type: PendingOperation["type"],
commentId: string,
userId?: string,
): void {
const key = pendingOpKey(type, commentId, userId);
pendingOperations.delete(key);
}

export function applyCommentCreated(
payload: CommentCreatedPayload,
currentUserId?: string | null,
): void {
const { snapshot, commentId, isReply } = payload;
if (!snapshot) return;

if (isOperationPending("create", commentId, currentUserId ?? undefined)) {
clearPending("create", commentId, currentUserId ?? undefined);
  }

globalMutate(
(key: readonly unknown[]): boolean => {
if (!Array.isArray(key) || key[0] !== "comments") return false;
const keyQuizId = key[1];
return keyQuizId === payload.quizId;
    },
(current: CommentCacheEntry | undefined) => {
if (!current?.items) return current;
return {
...current,
items: [...current.items],
      };
    },
{ revalidate: false },
  );

if (!isReply) {
globalMutate(
(key: readonly unknown[]): boolean => {
if (!Array.isArray(key) || key[0] !== "comments") return false;
const keyQuizId = key[1];
return keyQuizId === payload.quizId;
      },
(current: CommentCacheEntry | undefined) => {
if (!current?.items) return current;

if (current.items.some((c) => c.id === commentId)) return current;
const newThread = createThreadFromSnapshot(snapshot);
return {
...current,
items: [newThread, ...current.items],
        };
      },
{ revalidate: false },
    );
  }
}

export function applyCommentEdited(
payload: CommentEditedPayload,
currentUserId?: string | null,
): void {
const { snapshot, commentId } = payload;
if (!snapshot) return;

if (isOperationPending("edit", commentId, currentUserId ?? undefined)) {
clearPending("edit", commentId, currentUserId ?? undefined);
  }

globalMutate(
(key: readonly unknown[]): boolean => {
if (!Array.isArray(key) || key[0] !== "comments") return false;
return true; // Match all comment caches
    },
(current: CommentCacheEntry | undefined) => {
if (!current?.items) return current;
return {
...current,
items: current.items.map((thread) =>
applyEditToThread(thread, commentId, snapshot),
        ),
      };
    },
{ revalidate: false },
  );
}

export function applyCommentDeleted(
payload: CommentDeletedPayload,
currentUserId?: string | null,
): void {
const { commentId, quizId } = payload;

if (isOperationPending("delete", commentId, currentUserId ?? undefined)) {
clearPending("delete", commentId, currentUserId ?? undefined);
  }

globalMutate(
(key: readonly unknown[]): boolean => {
if (!Array.isArray(key) || key[0] !== "comments") return false;
const keyQuizId = key[1];
return keyQuizId === quizId;
    },
(current: CommentCacheEntry | undefined) => {
if (!current?.items) return current;

const updatedItems = current.items.map((thread) => {

if (thread.id === commentId) {
return {
...thread,
deletedAt: payload.timestamp,
          };
        }

if (thread.replies) {
const updatedReplies = thread.replies.map((reply) =>
reply.id === commentId
? { ...reply, deletedAt: payload.timestamp }
: reply,
          );
const hasUpdatedReplies = updatedReplies !== thread.replies;
if (hasUpdatedReplies) {
return {
...thread,
replies: updatedReplies,
repliesCount: Math.max(0, thread.repliesCount - 1),
            };
          }
        }
return thread;
      });

return {
...current,
items: updatedItems,
      };
    },
{ revalidate: false },
  );
}

export function applyCommentHidden(
payload: CommentHiddenPayload,
currentUserId?: string | null,
): void {
const { snapshot, commentId } = payload;
if (!snapshot) return;

if (isOperationPending("hide", commentId, currentUserId ?? undefined)) {
clearPending("hide", commentId, currentUserId ?? undefined);
  }

globalMutate(
(key: readonly unknown[]): boolean => {
if (!Array.isArray(key) || key[0] !== "comments") return false;
return true;
    },
(current: CommentCacheEntry | undefined) => {
if (!current?.items) return current;
return {
...current,
items: current.items.map((thread) =>
applyEditToThread(thread, commentId, snapshot),
        ),
      };
    },
{ revalidate: false },
  );
}

export function applyCommentRestored(
payload: CommentRestoredPayload,
currentUserId?: string | null,
): void {
const { snapshot, commentId } = payload;
if (!snapshot) return;

if (isOperationPending("restore", commentId, currentUserId ?? undefined)) {
clearPending("restore", commentId, currentUserId ?? undefined);
  }

globalMutate(
(key: readonly unknown[]): boolean => {
if (!Array.isArray(key) || key[0] !== "comments") return false;
return true;
    },
(current: CommentCacheEntry | undefined) => {
if (!current?.items) return current;
return {
...current,
items: current.items.map((thread) =>
applyEditToThread(thread, commentId, snapshot),
        ),
      };
    },
{ revalidate: false },
  );
}

export function applyVoteCast(
payload: VoteCastPayload,
currentUserId?: string | null,
): void {
const {
commentId,
voterId,
value,
votesCount,
upvotesCount,
downvotesCount,
  } = payload;

if (currentUserId && voterId === currentUserId) {
if (isOperationPending("vote", commentId, currentUserId)) {
clearPending("vote", commentId, currentUserId);
    }
  }

globalMutate(
(key: readonly unknown[]): boolean => {
if (!Array.isArray(key) || key[0] !== "comments") return false;
return true;
    },
(current: CommentCacheEntry | undefined) => {
if (!current?.items) return current;
return {
...current,
items: current.items.map((thread) =>
applyVoteToThread(
thread,
commentId,
voterId,
value,
votesCount,
upvotesCount,
downvotesCount,
currentUserId,
          ),
        ),
      };
    },
{ revalidate: false },
  );
}

export function applyVoteRemoved(
payload: VoteRemovedPayload,
currentUserId?: string | null,
): void {
const { commentId, voterId, votesCount, upvotesCount, downvotesCount } =
payload;

if (currentUserId && voterId === currentUserId) {
if (isOperationPending("unvote", commentId, currentUserId)) {
clearPending("unvote", commentId, currentUserId);
    }
  }

globalMutate(
(key: readonly unknown[]): boolean => {
if (!Array.isArray(key) || key[0] !== "comments") return false;
return true;
    },
(current: CommentCacheEntry | undefined) => {
if (!current?.items) return current;
return {
...current,
items: current.items.map((thread) =>
applyVoteToThread(
thread,
commentId,
voterId,
null,
votesCount,
upvotesCount,
downvotesCount,
currentUserId,
          ),
        ),
      };
    },
{ revalidate: false },
  );
}

function createThreadFromSnapshot(
snapshot: CommentSnapshot,
): CommentThreadItem {
return {
id: snapshot.id,
quizId: snapshot.quizId,
authorId: snapshot.authorId,
author: {
userId: snapshot.authorId,
username: snapshot.authorUsername,

displayName: (snapshot.authorDisplayName ?? null) as never,
avatarUrl: (snapshot.authorAvatarUrl ?? null) as never,
    },
parentCommentId: snapshot.parentCommentId,
body: snapshot.body,
isHidden: snapshot.isHidden,
hiddenById: null,
hiddenAt: null,
votesCount: snapshot.votesCount,
upvotesCount: snapshot.upvotesCount,
downvotesCount: snapshot.downvotesCount,
repliesCount: 0,
createdAt: snapshot.createdAt,
updatedAt: snapshot.updatedAt,
deletedAt: null,
replies: [],
userVote: snapshot.userVote,
  };
}

function applyEditToThread(
thread: CommentThreadItem,
commentId: string,
snapshot: CommentSnapshot,
): CommentThreadItem {
if (thread.id === commentId) {
return {
...thread,
body: snapshot.body,
updatedAt: snapshot.updatedAt,
isHidden: snapshot.isHidden,
deletedAt: snapshot.deletedAt,
    };
  }

if (thread.replies) {
const updatedReplies = thread.replies.map((reply) => {
if (reply.id === commentId) {
return {
...reply,
body: snapshot.body,
updatedAt: snapshot.updatedAt,
isHidden: snapshot.isHidden,
deletedAt: snapshot.deletedAt,
        };
      }
return reply;
    });

const hasUpdatedReplies = updatedReplies.some(
(reply, idx) =>
reply.id === commentId && reply.body !== thread.replies?.[idx]?.body,
    );

if (hasUpdatedReplies) {
return {
...thread,
replies: updatedReplies,
      };
    }
  }

return thread;
}

function applyVoteToThread(
thread: CommentThreadItem,
commentId: string,
voterId: string,
newVote: "upvote" | "downvote" | null,
votesCount: number,
upvotesCount: number,
downvotesCount: number,
currentUserId?: string | null,
): CommentThreadItem {

if (thread.id === commentId) {
const updatedThread = { ...thread };
updatedThread.votesCount = votesCount;
updatedThread.upvotesCount = upvotesCount;
updatedThread.downvotesCount = downvotesCount;

if (currentUserId && voterId === currentUserId) {
updatedThread.userVote = newVote;
    }

return updatedThread;
  }

if (thread.replies) {
const updatedReplies = thread.replies.map((reply) => {
if (reply.id === commentId) {
const updatedReply: CommentThreadItem["replies"][number] = {
...reply,
votesCount,
upvotesCount,
downvotesCount,
        };

if (
currentUserId &&
voterId === currentUserId &&
"userVote" in reply
        ) {
(updatedReply as CommentThreadItem["replies"][number] & {
userVote: CommentUserVote;
          }).userVote = newVote;
        }

return updatedReply;
      }
return reply;
    });

const hasUpdatedReplies = updatedReplies.some(
(reply) =>
reply.id === commentId &&
reply.votesCount !==
thread.replies?.find((r) => r.id === commentId)?.votesCount,
    );

if (hasUpdatedReplies) {
return {
...thread,
replies: updatedReplies,
      };
    }
  }

return thread;
}

export function useCommentCacheMutations() {
const registerCreate = useCallback((commentId: string) => {
registerPending("create", commentId);
  }, []);

const registerEdit = useCallback((commentId: string) => {
registerPending("edit", commentId);
  }, []);

const registerDelete = useCallback((commentId: string) => {
registerPending("delete", commentId);
  }, []);

const registerVote = useCallback((commentId: string) => {
registerPending("vote", commentId);
  }, []);

const registerUnvote = useCallback((commentId: string) => {
registerPending("unvote", commentId);
  }, []);

const registerHide = useCallback((commentId: string) => {
registerPending("hide", commentId);
  }, []);

const registerRestore = useCallback((commentId: string) => {
registerPending("restore", commentId);
  }, []);

return {
registerCreate,
registerEdit,
registerDelete,
registerVote,
registerUnvote,
registerHide,
registerRestore,
  };
}
