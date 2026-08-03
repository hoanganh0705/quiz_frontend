/**
 * `useEditComment` — edit-comment mutation hook.
 *
 * Source epic:   Epic 4.12 — Comments on a quiz.
 * Source ticket: T-4.12.7.
 *
 * ## What this hook owns
 *
 * - PATCH the user's own comment body via `editComment(commentId,
 *   { body })`.
 * - On success: invalidates the comments list cache for the affected
 *   quiz (the affected comment's `body`, `updatedAt`, and `isEdited`
 *   derive from the server).
 * - On error: sets `error: ApiError | null`. Does NOT throw.
 * - Returns `isLoading: true` during the mutation.
 * - `403 COMMENT_FORBIDDEN` indicates the viewer is not the author
 *   (ownership enforced by the backend per Epic 4.12 spec line 1438).
 *   The hook surfaces the typed error so the UI can hide edit controls.
 *
 * ## Why quiz-scoped invalidation
 *
 * The hook takes `commentId` (not `quizId`) — the caller does not
 * always know the `quizId` at the call site (e.g. an edit-form
 * mounted inside a comment thread). We instead use SWR's matcher
 * invalidation: invalidate every `comments` cache key regardless of
 * quiz. This is cheap because the comments domain is sparse (only
 * the comment-detail page populates this key) and matches the master
 * plan's "broadcast invalidation" approach for comment edits.
 *
 * ## Single-flight
 *
 * Mirrors `useCreateComment` — concurrent calls coalesce.
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';

import { isApiError, type ApiError } from '@/lib/api';
import { getUserCopy, type UserCopyEntry } from '@/lib/api/error-codes';

import { editComment } from '@/features/comments/services/comments.service';

// ─── Public types ──────────────────────────────────────────────────────────

export interface UseEditCommentOptions {
  /** Callback when the edit completes successfully. */
  onSuccess?: () => void;
  /** Callback when the edit fails. */
  onError?: (error: ApiError) => void;
}

export interface UseEditCommentResult {
  /**
   * Edit a comment. Resolves with `true` on success, `false` when
   * skipped (single-flight guard). Errors surface via `error`.
   */
  editComment: (payload: { body: string }) => Promise<boolean>;
  /** `true` while an edit is in flight. */
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
  // TODO (T-4.12.7): wire to Sentry.addBreadcrumb once feature flag is enabled.
  void category;
  void data;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useEditComment(
  commentId: string,
  options: UseEditCommentOptions = {},
): UseEditCommentResult {
  const { onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const inFlightRef = useRef<Promise<boolean> | null>(null);

  const errorCopy = error ? getUserCopy(error.code) : null;

  const handleEdit = useCallback(
    async ({ body }: { body: string }): Promise<boolean> => {
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setIsLoading(true);
      setError(null);

      const startedAt = Date.now();

      const core = (async (): Promise<boolean> => {
        try {
          await editComment(commentId, { body });

          // Invalidate every `comments` cache key (any quiz, any
          // filter) — the edited body only appears in this thread but
          // a stale copy could survive in a sibling hook instance.
          await globalMutate(
            (key: readonly unknown[]) => Array.isArray(key) && key[0] === 'comments',
            undefined,
            { revalidate: true },
          );

          emitBreadcrumb('phase4:4.12:edit-comment', {
            status: 'success',
            durationMs: Date.now() - startedAt,
          });

          onSuccess?.();
          return true;
        } catch (err) {
          if (isApiError(err)) {
            setError(err);
            onError?.(err);

            emitBreadcrumb('phase4:4.12:edit-comment', {
              status: 'error',
              durationMs: Date.now() - startedAt,
              code: err.code,
            });
            return false;
          }

          emitBreadcrumb('phase4:4.12:edit-comment', {
            status: 'error',
            durationMs: Date.now() - startedAt,
            code: 'GLOBAL_UNKNOWN',
          });
          console.warn('[useEditComment] unexpected rejection', err);
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
    [commentId, onSuccess, onError],
  );

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    editComment: handleEdit,
    isLoading,
    error,
    errorCopy,
    resetError,
  };
}
