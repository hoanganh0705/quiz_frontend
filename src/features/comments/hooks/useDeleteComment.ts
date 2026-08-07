/**
 * `useDeleteComment` — soft-delete mutation hook for the user's own
 * comments.
 *
 * Source epic:   Epic 4.12 — Comments on a quiz.
 * Source ticket: T-4.12.8.
 *
 * ## What this hook owns
 *
 * - DELETE the comment via `deleteComment(commentId)` (soft-delete).
 * - On success: invalidates the comments list cache for the affected
 *   quiz so the next render shows the `CommentDeletedPlaceholder`
 *   (rendered by the parent thread component).
 * - If the comment was a reply, decrements the parent thread's reply
 *   count in `useCommentThreadLookup` so the cap gate re-evaluates.
 *   The reply-count decrement is keyed by the *parent* comment id —
 *   the caller passes `parentId` via the hook's `replyToCommentId`
 *   option (delete-comment endpoints don't necessarily echo the
 *   parent on success).
 * - On `403 COMMENT_FORBIDDEN`: surface as `error` (UI hides delete
 *   controls when not the owner).
 * - The hook does NOT know about the deleted-placeholder UI; the
 *   parent thread observes the cache invalidation and renders the
 *   placeholder when the deleted comment is missing from the next
 *   response.
 *
 * ## Single-flight
 *
 * Mirrors the other comment mutation hooks.
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';

import { isApiError, type ApiError } from '@/lib/api';
import { getUserCopy, type UserCopyEntry } from '@/lib/api/error-codes';
import { logger } from '@/shared/log';

import { deleteComment } from '@/features/comments/services/comments.service';

// ─── Public types ──────────────────────────────────────────────────────────

export interface UseDeleteCommentOptions {
  /**
   * Optional — when set, identifies the parent comment to which this
   * comment was a reply. The hook decrements the parent's reply
   * count in the per-quiz lookup store so the cap gate relaxes. Pass
   * `null` / omit for top-level comments.
   */
  parentId?: string | null;
  /** Callback when the delete completes successfully. */
  onSuccess?: () => void;
  /** Callback when the delete fails. */
  onError?: (error: ApiError) => void;
}

export interface UseDeleteCommentResult {
  /**
   * Delete the comment. Resolves with `true` on success, `false` when
   * skipped (single-flight guard). Errors surface via `error`.
   */
  deleteComment: () => Promise<boolean>;
  /** `true` while a delete is in flight. */
  isLoading: boolean;
  /** The most recent error from the last submission. `null` until error. */
  error: ApiError | null;
  /** Classified user-copy entry for `error`. `null` when no error. */
  errorCopy: UserCopyEntry | null;
  /** Clear the current error and reset to idle. */
  resetError: () => void;
}

// ─── Telemetry ─────────────────────────────────────────────────────────────

function emitBreadcrumb(
  category: string,
  data: { status: string; durationMs: number; code?: string },
): void {
  // TODO (T-4.12.8): wire to Sentry.addBreadcrumb once feature flag is enabled.
  void category;
  void data;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useDeleteComment(
  commentId: string,
  options: UseDeleteCommentOptions = {},
): UseDeleteCommentResult {
  const { parentId, onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const inFlightRef = useRef<Promise<boolean> | null>(null);

  const errorCopy = error ? getUserCopy(error.code) : null;

  const handleDelete = useCallback(
    async (): Promise<boolean> => {
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setIsLoading(true);
      setError(null);

      const startedAt = Date.now();

      const core = (async (): Promise<boolean> => {
        try {
          await deleteComment(commentId);

          // Optimistically decrement the parent's reply count if this
          // was a reply. The lookup hook here is on the disabled
          // branch (quizId: null) — the actual decrement must run on
          // the same SWR cache entry the create hook wrote to. We
          // dispatch via the global SWR `mutate` API instead.
          if (parentId) {
            await globalMutate(
              (key: readonly unknown[]) =>
                Array.isArray(key) &&
                key[0] === 'comments' &&
                key[1] === 'thread',
              (current: Readonly<Record<string, { repliesCount: number }>> | undefined) => {
                const map = (current ?? {}) as Record<
                  string,
                  { repliesCount: number }
                >;
                const entry = map[parentId];
                if (!entry) return current ?? {};
                return {
                  ...map,
                  [parentId]: {
                    ...entry,
                    repliesCount: Math.max(0, entry.repliesCount - 1),
                  },
                };
              },
              { revalidate: false },
            );
          }

          // Invalidate the comments list cache (any quiz, any filter).
          await globalMutate(
            (key: readonly unknown[]) =>
              Array.isArray(key) && key[0] === 'comments',
            undefined,
            { revalidate: true },
          );

          emitBreadcrumb('phase4:4.12:delete-comment', {
            status: 'success',
            durationMs: Date.now() - startedAt,
          });

          onSuccess?.();
          return true;
        } catch (err) {
          if (isApiError(err)) {
            setError(err);
            onError?.(err);

            emitBreadcrumb('phase4:4.12:delete-comment', {
              status: 'error',
              durationMs: Date.now() - startedAt,
              code: err.code,
            });
            return false;
          }

          emitBreadcrumb('phase4:4.12:delete-comment', {
            status: 'error',
            durationMs: Date.now() - startedAt,
            code: 'GLOBAL_UNKNOWN',
          });
          logger.warn('comments.delete', 'unexpected rejection', err);
          return false;
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
    [commentId, parentId, onSuccess, onError],
  );

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    deleteComment: handleDelete,
    isLoading,
    error,
    errorCopy,
    resetError,
  };
}
