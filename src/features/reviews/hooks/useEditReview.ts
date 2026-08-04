/**
 * `useEditReview` — own-review edit mutation hook.
 *
 * Source epic:   Epic 4.13 — Reviews on a quiz.
 * Source ticket: T-4.13.9.
 *
 * ## What this hook owns
 *
 * - PATCH the authenticated user's review via `updateReview(quizId,
 *   payload)` (T-4.13.1). The service operates on the per-quiz
 *   unique review constraint — one review per user per quiz —
 *   so the hook takes `quizId` (not `reviewId`) as its identity
 *   parameter. The ticket planning input refers to "reviewId" but
 *   the verified SDK contract keys updates by quiz; the hook's
 *   parameter name reflects the deployed contract.
 * - On success: invalidates every page of the quiz's review list,
 *   the my-review cache, and the eligibility cache (the gate may
 *   flip back to `eligible` only when the review was deleted, not
 *   when it was edited, but the helper invalidates all three keys
 *   for symmetry — the gate resolution is idempotent).
 * - On error: surfaces a typed `ApiError` and a discriminated
 *   `lastOutcome` for the inline editor to branch on.
 *
 * ## Outcome model (T-4.13.9 AC #2–#6)
 *
 * - `success`     — review updated; editor can close.
 * - `forbidden`   — `403 REVIEW_FORBIDDEN`. The viewer is not the
 *                   author (the backend enforces ownership). The
 *                   editor hides itself; the gate does NOT flip.
 * - `validation`  — `422 REVIEW_VALIDATION`. Field-level errors map
 *                   back to `reviewFormSchema` fields.
 * - `stale`       — `404` (review deleted server-side). The list +
 *                   my-review caches are revalidated so the gate
 *                   resolves to `eligible` on the next render. The
 *                   editor surfaces an inline "this review is no
 *                   longer editable" notice.
 * - `reverted`    — every other failure (429, 5xx, transport).
 *
 * ## Why not `useOptimisticMutation`
 *
 * Mirrors `useCreateReview` (T-4.13.8) — we invalidate rather
 * than optimistically patch so the cache converges to the
 * server's authoritative ordering and timing.
 *
 * ## Single-flight
 *
 * A second `update()` call while the first is in flight returns
 * the same in-flight promise — no duplicate updates.
 *
 * ## Auth
 *
 * The hook assumes an authenticated viewer. The session id is
 * read from `useAuthBootstrap` so the session-scoped cache keys
 * (my-review, eligibility) are invalidated with the right
 * session marker.
 */

'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { isApiError, ApiError } from '@/lib/api';

import { useAuthBootstrap } from '@/features/auth/contexts/auth-bootstrap-context';
import { updateReview } from '@/features/reviews/services/reviews.service';
import {
  invalidateReviewCaches,
} from '@/features/reviews/types';

import type { UpdateReviewDto } from '@/lib/api/generated/schemas';

// ─── Public types ────────────────────────────────────────────────────────────

export type EditReviewOutcomeKind =
  | 'success'
  | 'forbidden'
  | 'validation'
  | 'stale'
  | 'reverted';

export interface EditReviewOutcome {
  kind: EditReviewOutcomeKind;
  /** The raw `ApiError` for typed-kind branches; `null` for `success`. */
  cause: ApiError | null;
}

export interface UseEditReviewOptions {
  /** Callback after a successful update. */
  onSuccess?: () => void;
  /** Callback for every failed update, including typed-kind failures. */
  onError?: (outcome: EditReviewOutcome) => void;
}

export interface UseEditReviewResult {
  /**
   * Update the existing review. Resolves to `true` on success,
   * `false` when dropped (single-flight guard) or rejected.
   * Outcomes surface via `lastOutcome` / `error`.
   */
  update: (payload: UpdateReviewDto) => Promise<boolean>;
  /** `true` while an update is in flight. */
  isLoading: boolean;
  /** The raw `ApiError` from the most recent failed update. `null` until a failure. */
  error: ApiError | null;
  /** Classified outcome of the most recent update. `null` until the first update. */
  lastOutcome: EditReviewOutcome | null;
  /** Clear `error` / `lastOutcome` and return to the idle state. */
  reset: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSyntheticApiError(
  status: number,
  code: string,
  message: string,
): ApiError {
  return new ApiError({
    isAxiosError: true,
    name: 'AxiosError',
    message,
    code,
    config: undefined,
    request: undefined,
    response: {
      status,
      statusText: message,
      data: {
        type: 'https://api.quiz.local/problems/synthetic',
        title: message,
        status,
        detail: message,
        extensions: { code, requestId: 'req-synthetic' },
      },
      headers: {},
      config: undefined as never,
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

async function invalidateAllReviewKeysForQuiz(
  mutate: typeof globalMutate,
  quizId: string,
): Promise<void> {
  await mutate(
    (key: readonly unknown[]) =>
      Array.isArray(key) && key[0] === 'reviews' && key[2] === quizId,
    undefined,
    { revalidate: true },
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Own-review edit mutation hook.
 *
 * @example
 * ```tsx
 * const { update, isLoading, lastOutcome, error } = useEditReview(quizId, {
 *   onSuccess: () => onClose(),
 * });
 *
 * <button
 *   disabled={isLoading}
 *   onClick={() => update({ rating, comment })}
 * >
 *   {isLoading ? 'Saving…' : 'Save changes'}
 * </button>
 *
 * {lastOutcome?.kind === 'forbidden' && <ForbiddenNotice />}
 * {lastOutcome?.kind === 'validation' && (
 *   <ValidationNotice apiError={error} />
 * )}
 * {lastOutcome?.kind === 'stale' && <StaleNotice />}
 * {lastOutcome?.kind === 'reverted' && <RetryNotice apiError={error} />}
 * ```
 */
export function useEditReview(
  quizId: string,
  options: UseEditReviewOptions = {},
): UseEditReviewResult {
  const { onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [lastOutcome, setLastOutcome] =
    useState<EditReviewOutcome | null>(null);

  const inFlightRef = useRef<Promise<boolean> | null>(null);

  const { currentUser } = useAuthBootstrap();
  const sessionId = useMemo<string | null>(() => {
    const u = currentUser as { id?: string; userId?: string } | null;
    if (!u) return null;
    return u.id ?? u.userId ?? null;
  }, [currentUser]);

  const handleUpdate = useCallback(
    async (payload: UpdateReviewDto): Promise<boolean> => {
      if (!quizId) {
        const synthetic = makeSyntheticApiError(
          0,
          'REVIEW_VALIDATION',
          'quizId is required to edit a review',
        );
        setError(synthetic);
        setLastOutcome({ kind: 'validation', cause: synthetic });
        onError?.({ kind: 'validation', cause: synthetic });
        return false;
      }

      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setIsLoading(true);
      setError(null);
      setLastOutcome(null);

      const core = (async (): Promise<boolean> => {
        try {
          await updateReview(quizId, payload);

          if (sessionId) {
            await invalidateReviewCaches(globalMutate as never, {
              quizId,
              sessionId,
            });
          } else {
            await invalidateAllReviewKeysForQuiz(globalMutate, quizId);
          }

          setLastOutcome({ kind: 'success', cause: null });
          onSuccess?.();
          return true;
        } catch (cause: unknown) {
          if (!isApiError(cause)) {
            const synthetic = makeSyntheticApiError(
              0,
              'GLOBAL_UNKNOWN',
              String(cause),
            );
            setError(synthetic);
            const outcome: EditReviewOutcome = {
              kind: 'reverted',
              cause: synthetic,
            };
            setLastOutcome(outcome);
            onError?.(outcome);
            return false;
          }

          switch (cause.code) {
            case 'REVIEW_FORBIDDEN': {
              // 403 — ownership check failed. Do NOT invalidate;
              // the review is intact but the viewer is not the
              // author. The editor hides itself.
              setError(cause);
              const outcome: EditReviewOutcome = {
                kind: 'forbidden',
                cause,
              };
              setLastOutcome(outcome);
              onError?.(outcome);
              return false;
            }
            case 'REVIEW_VALIDATION': {
              setError(cause);
              const outcome: EditReviewOutcome = {
                kind: 'validation',
                cause,
              };
              setLastOutcome(outcome);
              onError?.(outcome);
              return false;
            }
            case 'GLOBAL_NOT_FOUND': {
              // 404 — review deleted server-side. Revalidate so the
              // gate resolves to `eligible` (or whatever the next
              // canonical state is) on the next render.
              if (sessionId) {
                await invalidateReviewCaches(globalMutate as never, {
                  quizId,
                  sessionId,
                });
              } else {
                await invalidateAllReviewKeysForQuiz(globalMutate, quizId);
              }
              setError(cause);
              const outcome: EditReviewOutcome = {
                kind: 'stale',
                cause,
              };
              setLastOutcome(outcome);
              onError?.(outcome);
              return false;
            }
            default: {
              setError(cause);
              const outcome: EditReviewOutcome = {
                kind: 'reverted',
                cause,
              };
              setLastOutcome(outcome);
              onError?.(outcome);
              return false;
            }
          }
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
    [quizId, sessionId, onSuccess, onError],
  );

  const reset = useCallback(() => {
    setError(null);
    setLastOutcome(null);
  }, []);

  return {
    update: handleUpdate,
    isLoading,
    error,
    lastOutcome,
    reset,
  };
}
