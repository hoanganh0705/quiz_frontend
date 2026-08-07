/**
 * `useCreateComment` — create-comment mutation hook.
 *
 * Source epic:   Epic 4.12 — Comments on a quiz.
 * Source ticket: T-4.12.6.
 *
 * ## What this hook owns
 *
 * - POST a new top-level comment OR a level-1 reply (when `parentId`
 *   is set) via the `createComment` SDK function.
 * - On success: invalidates the quiz-level `commentsKey(quizId)` so
 *   `useQuizComments` refetches the thread list, AND increments the
 *   parent's reply-count in the per-quiz `useCommentThreadLookup`
 *   store so the client-side cap gate (`isAtReplyCap`) updates
 *   without waiting for the refetch to settle.
 * - On error: sets `error: ApiError | null`. Does NOT throw — the
 *   caller branches on `.code` via `getUserCopy`.
 * - Sets `isLoading: true` during the mutation.
 * - Handles `429` via a cooldown (60 s, matches the project's
 *   standard rate-limit cooldown policy from Epic 4.10).
 * - Handles `422 COMMENT_REPLY_LIMIT_EXCEEDED` by setting `error`
 *   to the typed `ApiError` so the form can show the banner copy
 *   via `getUserCopy(error.code)`.
 *
 * ## Why this hook does not use `useOptimisticMutation`
 *
 * `useOptimisticMutation` snapshots and reverts SWR cache data. For
 * the comments list we DO want a re-fetch on success (the new comment
 * might already be modified or trigger first-page reordering), so we
 * invalidate rather than optimistically patch. The reply-count is the
 * one piece of state we keep optimistic so the cap gate is responsive.
 *
 * ## Single-flight
 *
 * A second `createComment()` call while the first is in flight is
 * dropped (returns the same in-flight promise). This matches the
 * `useCreateVersionQuestion` pattern (T-4.10.6) — prevents duplicate
 * posts when the user double-clicks the Reply button.
 *
 * ## Auth
 *
 * The hook assumes an authenticated viewer (the create endpoint
 * requires auth). `useAuthState` short-circuit is intentionally NOT
 * here — callers (the comment composer UI) own that gate.
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';

import { isApiError, type ApiError } from '@/lib/api';
import { getUserCopy, type UserCopyEntry } from '@/lib/api/error-codes';
import { logger } from '@/shared/log';

import { createComment } from '@/features/comments/services/comments.service';
import { useCommentThreadLookup } from '@/features/comments/stores/useCommentThreadLookup';
import {
  commentsKey,
  commentThreadKey,
} from '@/features/comments/types';

import type { CreateCommentDto } from '@/lib/api/generated/schemas';

// ─── Public types ──────────────────────────────────────────────────────────

export interface UseCreateCommentOptions {
  /** Callback when the comment is created successfully. */
  onSuccess?: (comment: CreatedComment) => void;
  /** Callback when creation fails (not throttled by 429). */
  onError?: (error: ApiError) => void;
  /** Callback when the user is being rate-limited (HTTP 429). */
  onRateLimit?: (seconds: number) => void;
}

export interface CreatedComment {
  /** The created comment's id. */
  commentId: string;
}

export interface UseCreateCommentResult {
  /**
   * Create a comment. Resolves with the created comment on success,
   * `null` if skipped (single-flight guard / cooldown), and surfaces
   * errors via `error` rather than throwing.
   */
  createComment: (
    payload: { body: string; parentId?: string },
  ) => Promise<CreatedComment | null>;
  /** `true` while a creation is in flight. */
  isLoading: boolean;
  /**
   * The most recent error from the last submission. `null` until an
   * error occurs. Use `.code` with `getUserCopy` for user copy.
   */
  error: ApiError | null;
  /** Classified user-copy entry for `error`. `null` when no error. */
  errorCopy: UserCopyEntry | null;
  /** Rate-limit cooldown remaining (seconds). `null` when not cooling. */
  cooldownSeconds: number | null;
  /** Clear the current error and reset to idle. */
  resetError: () => void;
}

// ─── Telemetry ─────────────────────────────────────────────────────────────

function emitBreadcrumb(
  category: string,
  data: { status: string; durationMs: number; code?: string },
): void {
  // TODO (T-4.12.6): wire to Sentry.addBreadcrumb once feature flag is enabled.
  void category;
  void data;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

const COOLDOWN_SECONDS_DEFAULT = 60;

export function useCreateComment(
  quizId: string,
  options: UseCreateCommentOptions = {},
): UseCreateCommentResult {
  const { onSuccess, onError, onRateLimit } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);

  // Single-flight ref — guards against double-click races.
  const inFlightRef = useRef<Promise<CreatedComment | null> | null>(null);

  const lookup = useCommentThreadLookup(quizId);
  const errorCopy = error ? getUserCopy(error.code) : null;

  const handleCreate = useCallback(
    async ({
      body,
      parentId,
    }: {
      body: string;
      parentId?: string;
    }): Promise<CreatedComment | null> => {
      // Guard: single-flight coalescing.
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      // Guard: cooldown active (from a previous 429).
      if (cooldownSeconds !== null && cooldownSeconds > 0) {
        return null;
      }

      setIsLoading(true);
      setError(null);

      const startedAt = Date.now();
      const payload: CreateCommentDto = parentId
        ? { body, parentCommentId: parentId }
        : { body };

      const core = (async (): Promise<CreatedComment | null> => {
        try {
          const response = (await createComment(quizId, payload)) as unknown as {
            data?: CreatedComment;
            commentId?: string;
          };
          // The SDK wraps the response in `{ data: ... }`; the unwrapped
          // shape may also be returned depending on the orval path. We
          // accept either for forward compatibility.
          const created: CreatedComment = {
            commentId:
              response.data?.commentId ??
              response.commentId ??
              '',
          };

          // Optimistic reply-count increment so the Reply button's cap
          // gate re-evaluates without waiting for the refetch.
          if (parentId) {
            lookup.incrementRepliesCount(parentId);
          }

          // Invalidate the comments list cache so the new comment
          // appears at the right position (top-level vs. reply).
          await globalMutate(
            (key: readonly unknown[]) =>
              Array.isArray(key) &&
              key[0] === 'comments' &&
              key[1] === quizId,
            undefined,
            { revalidate: true },
          );
          await globalMutate(commentThreadKey(quizId), undefined, {
            revalidate: true,
          });

          // Also nudge the commentsKey for the exact filters (top-level
          // vs. replies) so both paginations get a refetch.
          await globalMutate(commentsKey(quizId), undefined, {
            revalidate: true,
          });
          if (parentId) {
            await globalMutate(
              commentsKey(quizId, { parentId }),
              undefined,
              { revalidate: true },
            );
          }

          emitBreadcrumb('phase4:4.12:create-comment', {
            status: 'success',
            durationMs: Date.now() - startedAt,
          });

          onSuccess?.(created);
          return created;
        } catch (err) {
          if (isApiError(err)) {
            if (err.status === 429) {
              const seconds = COOLDOWN_SECONDS_DEFAULT;
              setCooldownSeconds(seconds);
              const interval = setInterval(() => {
                setCooldownSeconds((prev) => {
                  if (prev === null || prev <= 1) {
                    clearInterval(interval);
                    return null;
                  }
                  return prev - 1;
                });
              }, 1000);
              onRateLimit?.(seconds);

              emitBreadcrumb('phase4:4.12:create-comment', {
                status: 'cooldown',
                durationMs: Date.now() - startedAt,
                code: err.code,
              });
              return null;
            }

            setError(err);
            onError?.(err);

            emitBreadcrumb('phase4:4.12:create-comment', {
              status: 'error',
              durationMs: Date.now() - startedAt,
              code: err.code,
            });
            return null;
          }

          // Unknown rejection shape — surface as-is.
          const wrapped = new Error(String(err));
          emitBreadcrumb('phase4:4.12:create-comment', {
            status: 'error',
            durationMs: Date.now() - startedAt,
            code: 'GLOBAL_UNKNOWN',
          });
          logger.warn('comments.create', 'unexpected rejection', { err, wrapped });
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
    [quizId, lookup, cooldownSeconds, onSuccess, onError, onRateLimit],
  );

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    createComment: handleCreate,
    isLoading,
    error,
    errorCopy,
    cooldownSeconds,
    resetError,
  };
}
