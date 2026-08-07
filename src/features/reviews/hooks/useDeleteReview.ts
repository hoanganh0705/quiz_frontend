/**
 * `useDeleteReview` — confirmed own-review delete mutation hook.
 *
 * Source epic:   Epic 4.13 — Reviews on a quiz.
 * Source ticket: T-4.13.10.
 *
 * ## What this hook owns
 *
 * - DELETE the authenticated user's review via `deleteReview(quizId)`
 *   (T-4.13.1). Like `useEditReview`, the SDK keys deletion by
 *   `quizId` (one review per user per quiz) — the hook takes
 *   `quizId` and infers the review identity from it.
 * - On success: invalidates every page of the quiz's review list,
 *   the my-review cache, and the eligibility cache so the gate
 *   can flip back to `eligible` once the viewer completes a new
 *   attempt. (The eligibility itself does not change — the
 *   completed attempt is still there — but the gate must
 *   re-resolve because the my-review key transitions from a
 *   populated state to `null`.)
 * - On error: surfaces a typed `ApiError` and a discriminated
 *   `lastOutcome` for the confirmation dialog to branch on.
 *
 * ## Confirmed trigger (T-4.13.10 AC #1)
 *
 * The hook exposes NO automatic-on-render behavior. The exported
 * `remove()` trigger is intended to be invoked only after the
 * user explicitly confirms via `<ConfirmDialog
 * kind="destructive-permanent" />` (matching the `useDeleteCollection`
 * precedent from Story 4.6 / T-4.6-B4).
 *
 * ## Outcome model (T-4.13.10 AC #3–#7)
 *
 * - `success`     — review deleted; confirmation dialog closes.
 * - `not-found`   — `404` (already deleted server-side). Treated
 *                   as a benign no-op — list + my-review are
 *                   revalidated so the gate resolves cleanly.
 * - `forbidden`   — `403 REVIEW_FORBIDDEN`. The viewer is not the
 *                   author; the dialog surfaces an inline error.
 * - `reverted`    — every other failure (429, 5xx, transport).
 *
 * ## Single-flight
 *
 * A second `remove()` call while the first is in flight returns
 * the same in-flight promise — no duplicate deletes.
 *
 * ## Auth
 *
 * The hook assumes an authenticated viewer. The session id is
 * read from `useAuthSession` so the session-scoped cache keys
 * (my-review, eligibility) are invalidated with the right
 * session marker.
 */

'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { isApiError, ApiError } from '@/lib/api';

import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { deleteReview } from '@/features/reviews/services/reviews.service';
import {
  invalidateReviewCaches,
} from '@/features/reviews/types';

// ─── Public types ────────────────────────────────────────────────────────────

export type DeleteReviewOutcomeKind =
  | 'success'
  | 'not-found'
  | 'forbidden'
  | 'reverted';

export interface DeleteReviewOutcome {
  kind: DeleteReviewOutcomeKind;
  /** The raw `ApiError` for typed-kind branches; `null` for `success`. */
  cause: ApiError | null;
}

export interface UseDeleteReviewOptions {
  /** Callback after a successful delete. */
  onSuccess?: () => void;
  /** Callback for every failed delete, including typed-kind failures. */
  onError?: (outcome: DeleteReviewOutcome) => void;
}

export interface UseDeleteReviewResult {
  /**
   * Trigger the delete mutation. Intended to be called only from
   * the confirmed dialog path (T-4.13.10 AC #1). Resolves to
   * `true` on success, `false` when dropped (single-flight guard)
   * or rejected. Outcomes surface via `lastOutcome` / `error`.
   */
  remove: () => Promise<boolean>;
  /** `true` while a delete is in flight. */
  isLoading: boolean;
  /** The raw `ApiError` from the most recent failed delete. `null` until a failure. */
  error: ApiError | null;
  /** Classified outcome of the most recent delete. `null` until the first delete. */
  lastOutcome: DeleteReviewOutcome | null;
  /** Clear `error` / `lastOutcome` and return to the idle state. */
  reset: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
 * Confirmed own-review delete mutation hook.
 *
 * @example
 * ```tsx
 * const { remove, isLoading, lastOutcome, error } = useDeleteReview(quizId, {
 *   onSuccess: () => onClose(),
 * });
 *
 * <ConfirmDialog
 *   kind="destructive-permanent"
 *   onConfirm={remove}
 *   isLoading={isLoading}
 * >
 *   Delete my review
 * </ConfirmDialog>
 *
 * {lastOutcome?.kind === 'forbidden' && <ForbiddenNotice />}
 * {lastOutcome?.kind === 'not-found' && <AlreadyDeletedNotice />}
 * {lastOutcome?.kind === 'reverted' && <RetryNotice apiError={error} />}
 * ```
 */
export function useDeleteReview(
  quizId: string,
  options: UseDeleteReviewOptions = {},
): UseDeleteReviewResult {
  const { onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [lastOutcome, setLastOutcome] =
    useState<DeleteReviewOutcome | null>(null);

  const inFlightRef = useRef<Promise<boolean> | null>(null);

  const { currentUser } = useAuthSession();
  const sessionId = useMemo<string | null>(() => {
    const u = currentUser as { id?: string; userId?: string } | null;
    if (!u) return null;
    return u.id ?? u.userId ?? null;
  }, [currentUser]);

  const handleRemove = useCallback(async (): Promise<boolean> => {
    if (!quizId) {
      const synthetic = makeSyntheticApiError(
        0,
        'REVIEW_VALIDATION',
        'quizId is required to delete a review',
      );
      setError(synthetic);
      setLastOutcome({ kind: 'reverted', cause: synthetic });
      onError?.({ kind: 'reverted', cause: synthetic });
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
        await deleteReview(quizId);

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
          const outcome: DeleteReviewOutcome = {
            kind: 'reverted',
            cause: synthetic,
          };
          setLastOutcome(outcome);
          onError?.(outcome);
          return false;
        }

        switch (cause.code) {
          case 'GLOBAL_NOT_FOUND': {
            // 404 — already deleted server-side (e.g. by another
            // tab). Mute as a benign no-op; revalidate so the
            // gate + list converge cleanly.
            if (sessionId) {
              await invalidateReviewCaches(globalMutate as never, {
                quizId,
                sessionId,
              });
            } else {
              await invalidateAllReviewKeysForQuiz(globalMutate, quizId);
            }
            setLastOutcome({ kind: 'not-found', cause });
            // Not an error from the user's perspective; surface
            // the typed outcome without setting `error` so the
            // destructive toast stays quiet.
            onError?.({ kind: 'not-found', cause });
            return false;
          }
          case 'REVIEW_FORBIDDEN': {
            setError(cause);
            const outcome: DeleteReviewOutcome = {
              kind: 'forbidden',
              cause,
            };
            setLastOutcome(outcome);
            onError?.(outcome);
            return false;
          }
          default: {
            setError(cause);
            const outcome: DeleteReviewOutcome = {
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
  }, [quizId, sessionId, onSuccess, onError]);

  const reset = useCallback(() => {
    setError(null);
    setLastOutcome(null);
  }, []);

  return {
    remove: handleRemove,
    isLoading,
    error,
    lastOutcome,
    reset,
  };
}

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
