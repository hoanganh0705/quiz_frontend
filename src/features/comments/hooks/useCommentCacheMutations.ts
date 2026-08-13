/**
 * `useCommentCacheMutations` — direct SWR cache mutations for realtime events.
 *
 * This hook provides functions that directly apply WebSocket events to the
 * local SWR cache without requiring a refetch. This enables truly-live
 * updates where:
 *   - New comments appear instantly without flicker
 *   - Edits reflect immediately
 *   - Vote counts update in real-time
 *   - Delete/hide/restore transitions happen live
 *
 * ## Mutation Deduplication
 *
 * To prevent duplicate operations when both optimistic updates AND realtime
 * events are active, each mutation tracks a set of "pending" operation IDs.
 * When a realtime event arrives with an ID that's already pending, it's
 * skipped because the optimistic update already handled it.
 *
 * ## Architecture
 *
 * This module operates at the SWR cache level, directly manipulating the
 * cached data structures. It uses globalMutate with a matcher to find all
 * relevant comment caches for a quiz.
 */

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

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Pending operation for deduplication.
 * Tracks which operations are in-flight to prevent duplicate processing.
 */
interface PendingOperation {
  type: "create" | "edit" | "delete" | "vote" | "unvote" | "hide" | "restore";
  commentId: string;
  timestamp: number;
}

/**
 * SWR cache entry shape for comment lists.
 */
interface CommentCacheEntry {
  items?: CommentThreadItem[];
  hasNextPage?: boolean;
  /**
   * Pagination cursor for the next SWR page load. The realtime cache
   * shadow keeps the field so optimistic reads from `useQuizComments`
   * continue to see the same envelope, but it is never *read* here —
   * cursor handling is owned by `useCursorPaginated` (Epic 3.2).
   */
  nextPageMarker?: string | null;
}

// ─── Pending Operations Store ───────────────────────────────────────────────

/**
 * Global set of pending operations for deduplication.
 * Uses a Map with timestamps for cleanup of stale entries.
 */
const pendingOperations = new Map<string, PendingOperation>();

/**
 * Cleanup interval for stale pending operations (older than 30 seconds).
 */
const PENDING_OPERATION_TTL_MS = 30_000;

setInterval(() => {
  const now = Date.now();
  for (const [key, op] of pendingOperations.entries()) {
    if (now - op.timestamp > PENDING_OPERATION_TTL_MS) {
      pendingOperations.delete(key);
    }
  }
}, 10_000);

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Generate a pending operation key.
 */
function pendingOpKey(
  type: PendingOperation["type"],
  commentId: string,
  userId?: string,
): string {
  return `${type}:${commentId}:${userId ?? "anon"}`;
}

/**
 * Check if an operation is pending (already optimistic-applied).
 */
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

/**
 * Register a pending operation.
 */
function registerPending(
  type: PendingOperation["type"],
  commentId: string,
  userId?: string,
): void {
  const key = pendingOpKey(type, commentId, userId);
  pendingOperations.set(key, { type, commentId, timestamp: Date.now() });
}

/**
 * Clear a pending operation after it's confirmed by realtime or timeout.
 */
function clearPending(
  type: PendingOperation["type"],
  commentId: string,
  userId?: string,
): void {
  const key = pendingOpKey(type, commentId, userId);
  pendingOperations.delete(key);
}

// ─── SWR Cache Mutation Functions ───────────────────────────────────────────
export function applyCommentCreated(
  payload: CommentCreatedPayload,
  currentUserId?: string | null,
): void {
  const { snapshot, commentId, isReply } = payload;
  if (!snapshot) return;

  // Check if already pending (optimistic)
  if (isOperationPending("create", commentId, currentUserId ?? undefined)) {
    clearPending("create", commentId, currentUserId ?? undefined);
  }

  // Find and update all comment caches for this quiz
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

  // For top-level comments, add to the front of the list
  if (!isReply) {
    globalMutate(
      (key: readonly unknown[]): boolean => {
        if (!Array.isArray(key) || key[0] !== "comments") return false;
        const keyQuizId = key[1];
        return keyQuizId === payload.quizId;
      },
      (current: CommentCacheEntry | undefined) => {
        if (!current?.items) return current;
        // Check if already in list
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

/**
 * Apply a comment edited event to the cache.
 */
export function applyCommentEdited(
  payload: CommentEditedPayload,
  currentUserId?: string | null,
): void {
  const { snapshot, commentId } = payload;
  if (!snapshot) return;

  // Check if already pending (optimistic)
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

/**
 * Apply a comment deleted event to the cache.
 */
export function applyCommentDeleted(
  payload: CommentDeletedPayload,
  currentUserId?: string | null,
): void {
  const { commentId, quizId } = payload;

  // Check if already pending (optimistic)
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

      // Mark as deleted (soft delete - keep in thread but show deleted placeholder)
      const updatedItems = current.items.map((thread) => {
        // If it's the top-level comment being deleted
        if (thread.id === commentId) {
          return {
            ...thread,
            deletedAt: payload.timestamp,
          };
        }
        // Check replies
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

/**
 * Apply a comment hidden event to the cache.
 */
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

/**
 * Apply a comment restored event to the cache.
 */
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

/**
 * Apply a vote cast event to the cache.
 */
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

  // Check if the current user already applied this optimistically
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

/**
 * Apply a vote removed event to the cache.
 */
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

// ─── Helper Functions ───────────────────────────────────────────────────────

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
      // The generated SDK types `displayName` / `avatarUrl` as the loose
      // `{ [key: string]: unknown } | null` for forward-compat with the
      // Wire envelope. The realtime snapshot carries the denormalised
      // `string | null` value straight from the backend; we adapt it
      // to the SDK's nullable-object shape here.
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
  // Check if this vote is for the top-level comment
  if (thread.id === commentId) {
    const updatedThread = { ...thread };
    updatedThread.votesCount = votesCount;
    updatedThread.upvotesCount = upvotesCount;
    updatedThread.downvotesCount = downvotesCount;

    // Update user's vote if they're the voter
    if (currentUserId && voterId === currentUserId) {
      updatedThread.userVote = newVote;
    }

    return updatedThread;
  }

  // Check replies
  if (thread.replies) {
    const updatedReplies = thread.replies.map((reply) => {
      if (reply.id === commentId) {
        const updatedReply: CommentThreadItem["replies"][number] = {
          ...reply,
          votesCount,
          upvotesCount,
          downvotesCount,
        };

        // Replies in the SDK shape don't carry `userVote`, so we only
        // attach it when the cache entry actually includes the field
        // (i.e. when the swr envelope is the richer wire response).
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

// ─── Hook for mutation registration ────────────────────────────────────────

/**
 * Hook for registering pending operations to coordinate with realtime events.
 * Call this after applying an optimistic update to track the pending operation.
 */
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
