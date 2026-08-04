/**
 * `useMyQuizReview` — authenticated "my review for this quiz" hook.
 *
 * Source epic:   Epic 4.13 — Reviews on a quiz.
 * Source ticket: T-4.13.5.
 *
 * ## What this hook owns
 *
 * - Calls the `getMyQuizReview(quizId)` service wrapper (T-4.13.1)
 *   which already normalises HTTP 404 to `null` and propagates every
 *   other failure as a typed `ApiError`.
 * - Wraps the result in `useSingleWithRetry` (Epic 3.6) for the
 *   250 / 500 / 1000 ms 429 backoff policy and the manual `retry()`
 *   action.
 * - Gated on `useAuthBootstrap` so the private read never fires
 *   while the auth bootstrap is unresolved or the user is
 *   unauthenticated. This preserves the approved cheaper-path
 *   ordering in the gate hook (T-4.13.7).
 * - Exposes a `hasResolved` flag the gate hook uses to distinguish
 *   "we asked and the user has no review" from "we are still
 *   loading" so the create form does not flash open on the very
 *   first render of a logged-in viewer.
 *
 * ## Return shape
 *
 *   `{ review, isLoading, hasResolved, error, retry }`.
 *   - `review`: the user's review projection, or `null` when none
 *     exists. Never `undefined` once the fetch resolves.
 *   - `isLoading`: true only while the fetch is in flight.
 *   - `hasResolved`: true once the first fetch settles (success,
 *     404-as-null, or error).
 *   - `error`: typed `ApiError` for non-404 failures, `null` for
 *     success / no-review.
 *   - `retry`: manual revalidation for the same quiz's cache key.
 *
 * ## Auth
 *
 * The hook is safe to call with `quizId: null` or while the auth
 * bootstrap is unresolved — it returns a disabled state without
 * firing the service.
 */

'use client';

import { useCallback, useMemo } from 'react';

import { useSingleWithRetry } from '@/lib/api';

import { getMyQuizReview } from '@/features/reviews/services/reviews.service';
import { useAuthBootstrap } from '@/features/auth/contexts/auth-bootstrap-context';
import {
  myQuizReviewKey,
  type MyReviewDto,
} from '@/features/reviews/types';

// ─── Public types ────────────────────────────────────────────────────────────

export interface UseMyQuizReviewResult {
  /** The viewer's review for this quiz, or `null` when none exists. */
  review: MyReviewDto | null;
  /** True only while the fetch is in flight. */
  isLoading: boolean;
  /**
   * True once the first fetch settles (success, 404-as-null, or
   * error). The gate hook uses this to keep the create form closed
   * while we are still loading.
   */
  hasResolved: boolean;
  /** Typed `ApiError` for non-404 failures. `null` on success or 404. */
  error: import('@/lib/api').ApiError | null;
  /** Manual revalidation for the same quiz's key. */
  retry: () => Promise<void>;
}

export interface UseMyQuizReviewParams {
  /** Quiz ID to fetch the viewer's review for. Pass `null` to disable. */
  quizId: string | null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Authenticated "my review for this quiz" lookup.
 *
 * @example
 *   const { review, isLoading, hasResolved } = useMyQuizReview({
 *     quizId: 'uuid',
 *   });
 */
export function useMyQuizReview(
  params: UseMyQuizReviewParams,
): UseMyQuizReviewResult {
  const { quizId } = params;

  const { bootstrapState, currentUser } = useAuthBootstrap();

  // Stable session id derived from the bootstrap's currentUser. The
  // session is `null` until bootstrap completes, which the key
  // builder below maps to a "no fetch" state.
  const sessionId = useMemo<string | null>(() => {
    if (bootstrapState !== 'authenticated') return null;
    if (!currentUser) return null;
    const id = (currentUser as { id?: string; userId?: string }).id
      ?? (currentUser as { userId?: string }).userId;
    return id ?? null;
  }, [bootstrapState, currentUser]);

  // The single-resource primitive's key drives both SWR identity and
  // the "disabled" sentinel. We pass `null` when any of (a) the quiz
  // id is missing, (b) auth bootstrap is not yet resolved, or (c)
  // the bootstrap produced no currentUser.
  const key = useMemo(
    () =>
      quizId === null || sessionId === null
        ? null
        : myQuizReviewKey(quizId, sessionId),
    [quizId, sessionId],
  );

  const fetcher = useMemo(
    () =>
      async ({
        signal,
      }: {
        signal: AbortSignal;
      }): Promise<MyReviewDto | null> => {
        if (quizId === null) {
          // Defensive: the key is null when this branch is taken, so
          // the primitive should not call the fetcher. Returning
          // `null` matches the disabled behaviour without throwing.
          return null;
        }
        const result = await getMyQuizReview(quizId);
        if (signal.aborted) {
          // Match the single-resource primitive's abort semantics.
          return result ? { ...result, id: result.reviewId } : null;
        }
        return result ? { ...result, id: result.reviewId } : null;
      },
    [quizId],
  );

  const { data, isLoading, error, retry } = useSingleWithRetry<
    MyReviewDto | null
  >({
    key,
    fetcher,
  });

  // `hasResolved` is true once the first fetch has settled for the
  // current key. We use a memoized `useCallback` so the public
  // result is referentially stable across renders that do not flip
  // the primitive's state.
  const hasResolved = !isLoading && (data !== undefined || error !== null);

  const stableRetry = useCallback(async () => {
    await retry();
  }, [retry]);

  return {
    review: data ?? null,
    isLoading,
    hasResolved,
    error,
    retry: stableRetry,
  };
}
