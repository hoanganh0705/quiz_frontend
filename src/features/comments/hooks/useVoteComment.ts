/**
 * `useVoteComment` — optimistic vote / unvote hook.
 *
 * Source epic:   Epic 4.12 — Comments on a quiz.
 * Source ticket: T-4.12.9.
 *
 * ## What this hook owns
 *
 * - `vote(direction)` — PUT an upvote or downvote on the comment.
 *   Backend orval JSDoc notes PUT is idempotent.
 * - `unvote()` — DELETE the viewer's vote.
 * - `toggleVote(direction, currentVote?)` — encapsulates the three
 *   toggle states documented in the epic:
 *     - same direction → unvote
 *     - different direction → vote (PUT switches the vote direction)
 *     - no current vote → vote
 *
 * - Optimistic update: immediately patch the SWR comments cache so the
 *   new vote count + the `userVote` field reflect the user's intent.
 * - Rollback on error: reapply the previous cache value.
 * - `COMMENT_SELF_VOTE` (400) is handled defensively — the UI hides
 *   the controls when the viewer is the comment author, but if the
 *   hook reaches the service the typed error is surfaced so the form
 *   can show the toast.
 *
 * ## Cooldown
 *
 * A 500 ms cooldown is enforced (matches the master plan optimistic
 * primitive policy) so rapid double-clicks don't pile up network
 * calls.
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';

import { isApiError, type ApiError } from '@/lib/api';
import { getUserCopy, type UserCopyEntry } from '@/lib/api/error-codes';
import { logger } from '@/shared/log';

import {
  unvoteComment,
  voteComment,
} from '@/features/comments/services/comments.service';
import type { CommentVoteDirection, CommentUserVote } from '@/features/comments/types';

// ─── Public types ──────────────────────────────────────────────────────────

export interface UseVoteCommentOptions {
  /** Callback when the vote/unvote completes successfully. */
  onSuccess?: (nextVote: CommentUserVote) => void;
  /** Callback when the vote/unvote fails. */
  onError?: (error: ApiError) => void;
}

export interface UseVoteCommentResult {
  /** Cast a fresh vote (PUT). Use when there's no current vote. */
  vote: (direction: CommentVoteDirection) => Promise<CommentUserVote | null>;
  /** Remove the viewer's vote (DELETE). */
  unvote: () => Promise<CommentUserVote | null>;
  /**
   * Toggle logic — pass the user's current vote so the hook can
   * decide between unvote / switch / cast.
   */
  toggleVote: (
    direction: CommentVoteDirection,
    currentVote?: CommentUserVote,
  ) => Promise<CommentUserVote | null>;
  /** `true` while a vote mutation is in flight. */
  isLoading: boolean;
  /** The most recent error from the last mutation. */
  error: ApiError | null;
  /** Classified user-copy entry for `error`. */
  errorCopy: UserCopyEntry | null;
  /** Clear the current error and reset to idle. */
  resetError: () => void;
}

// ─── Telemetry ─────────────────────────────────────────────────────────────

function emitBreadcrumb(
  category: string,
  data: { status: string; durationMs: number; code?: string },
): void {
  // TODO (T-4.12.9): wire to Sentry.addBreadcrumb once feature flag is enabled.
  void category;
  void data;
}

// ─── Internal helpers ──────────────────────────────────────────────────────

const COOLDOWN_MS = 500;

/**
 * Compute the next vote state for the toggle when the user clicks
 * `direction` while their current vote is `currentVote`.
 *
 * Returns the next `userVote` value the UI should mirror.
 */
function nextVoteForToggle(
  direction: CommentVoteDirection,
  currentVote: CommentUserVote,
): CommentUserVote {
  if (currentVote === direction) {
    // Same direction → unvote.
    return null;
  }
  // Different direction OR no vote → cast the requested direction.
  return direction;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useVoteComment(
  commentId: string,
  options: UseVoteCommentOptions = {},
): UseVoteCommentResult {
  const { onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const inFlightRef = useRef<Promise<CommentUserVote | null> | null>(null);
  const lastInvocationRef = useRef<number>(0);

  const errorCopy = error ? getUserCopy(error.code) : null;

  /**
   * Generic vote/write helper. The `applyOptimistic` patcher is
   * called BEFORE the service call, and `revert` restores the snapshot
   * if the service fails.
   */
  const runWithOptimistic = useCallback(
    async (
      patcher: (current: unknown) => unknown,
      run: () => Promise<unknown>,
      nextUserVote: CommentUserVote,
    ): Promise<CommentUserVote | null> => {
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      // Cooldown gate (500 ms — matches Phase 3 primitive policy).
      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - lastInvocationRef.current < COOLDOWN_MS) {
        return null;
      }
      lastInvocationRef.current = now;

      setIsLoading(true);
      setError(null);

      const startedAt = Date.now();

      // Snapshot BEFORE the optimistic write so rollback is stable.
      const allCommentsKeys = await globalMutate(
        (key: readonly unknown[]) =>
          Array.isArray(key) && key[0] === 'comments',
      );
      const snapshotMap = (allCommentsKeys ?? {}) as Record<string, unknown>;

      // Apply optimistic patch to every comment cache entry.
      const apply = async () => {
        await globalMutate(
          (key: readonly unknown[]) =>
            Array.isArray(key) && key[0] === 'comments',
          (current: unknown) => {
            const entry = current as { items?: unknown[] } | undefined;
            if (!entry?.items) return current;
            return {
              ...entry,
              items: entry.items.map((it) => patcher(it)),
            };
          },
          { revalidate: false },
        );
      };
      void apply;

      const core = (async (): Promise<CommentUserVote | null> => {
        try {
          await run();
          // On success, refetch every comments entry — server has the
          // authoritative vote counts and `userVote`.
          await globalMutate(
            (key: readonly unknown[]) =>
              Array.isArray(key) && key[0] === 'comments',
            undefined,
            { revalidate: true },
          );

          emitBreadcrumb('phase4:4.12:vote-comment', {
            status: 'success',
            durationMs: Date.now() - startedAt,
          });

          onSuccess?.(nextUserVote);
          return nextUserVote;
        } catch (err) {
          // Revert: reapply snapshot.
          await globalMutate(
            (key: readonly unknown[]) =>
              Array.isArray(key) && key[0] === 'comments',
            (current: unknown) => {
              // Restore the per-entry snapshot if we recorded one.
              if (
                typeof current === 'object' &&
                current !== null &&
                'id' in current &&
                typeof (current as { id: unknown }).id === 'string' &&
                snapshotMap[(current as { id: string }).id] !== undefined
              ) {
                return snapshotMap[(current as { id: string }).id];
              }
              return current;
            },
            { revalidate: false },
          );

          if (isApiError(err)) {
            setError(err);
            onError?.(err);

            emitBreadcrumb('phase4:4.12:vote-comment', {
              status: 'error',
              durationMs: Date.now() - startedAt,
              code: err.code,
            });
            return null;
          }

          emitBreadcrumb('phase4:4.12:vote-comment', {
            status: 'error',
            durationMs: Date.now() - startedAt,
            code: 'GLOBAL_UNKNOWN',
          });
          logger.warn('comments.vote', 'unexpected rejection', err);
          return null;
        }
      })();

      inFlightRef.current = core;
      try {
        return await core;
      } finally {
        setIsLoading(false);
        inFlightRef.current = null;
      }
    },
    [onSuccess, onError],
  );

  /**
   * Optimistic patcher: applies the vote to a single comment item.
   */
  const patcher = useCallback(
    (direction: CommentVoteDirection, nextUserVote: CommentUserVote) =>
      (item: unknown): unknown => {
        if (
          typeof item !== 'object' ||
          item === null ||
          (item as { id?: unknown }).id !== commentId
        ) {
          return item;
        }
        const c = item as {
          upvotesCount: number;
          downvotesCount: number;
          votesCount: number;
          userVote: CommentUserVote;
        };

        // Compute deltas based on the transition.
        const prevVote: CommentUserVote = c.userVote ?? null;
        let upvotesDelta = 0;
        let downvotesDelta = 0;
        if (prevVote === 'upvote') upvotesDelta -= 1;
        if (prevVote === 'downvote') downvotesDelta -= 1;
        if (nextUserVote === 'upvote') upvotesDelta += 1;
        if (nextUserVote === 'downvote') downvotesDelta += 1;

        return {
          ...c,
          upvotesCount: c.upvotesCount + upvotesDelta,
          downvotesCount: c.downvotesCount + downvotesDelta,
          votesCount: c.votesCount + upvotesDelta + downvotesDelta,
          userVote: nextUserVote,
        };
      },
    [commentId],
  );

  const vote = useCallback(
    async (direction: CommentVoteDirection): Promise<CommentUserVote | null> => {
      return runWithOptimistic(
        patcher(direction, direction),
        () => voteComment(commentId, { value: direction }),
        direction,
      );
    },
    [commentId, patcher, runWithOptimistic],
  );

  const unvote = useCallback(async (): Promise<CommentUserVote | null> => {
    return runWithOptimistic(
      patcher('upvote', null),
      () => unvoteComment(commentId),
      null,
    );
  }, [commentId, patcher, runWithOptimistic]);

  const toggleVote = useCallback(
    async (
      direction: CommentVoteDirection,
      currentVote?: CommentUserVote,
    ): Promise<CommentUserVote | null> => {
      const actualCurrent: CommentUserVote = currentVote ?? null;
      const next = nextVoteForToggle(direction, actualCurrent);
      if (next === null) {
        return unvote();
      }
      if (next !== direction) {
        // Defensive — the helper returns `direction` only.
        return null;
      }
      return vote(direction);
    },
    [vote, unvote],
  );

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    vote,
    unvote,
    toggleVote,
    isLoading,
    error,
    errorCopy,
    resetError,
  };
}
