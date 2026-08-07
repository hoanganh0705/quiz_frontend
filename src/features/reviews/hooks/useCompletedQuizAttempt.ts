/**
 * `useCompletedQuizAttempt` — quiz-scoped completed-attempt eligibility.
 *
 * Source epic:   Epic 4.13 — Reviews on a quiz.
 * Source ticket: T-4.13.6.
 *
 * ## What this hook owns
 *
 * - Determines whether the authenticated user has at least one
 *   completed attempt for the current quiz — the gate the
 *   `useReviewGate` hook (T-4.13.7) needs to render the "complete
 *   a quiz first" notice vs. the create form.
 * - Calls `listMyAttempts({ quizId, status: 'completed', limit: 1 })`
 *   on the attempts service. The wire envelope is unwrapped into an
 *   attempt-summary list; the presence of any item resolves the
 *   gate to `eligible`.
 * - Treats 404 the same as an empty page — the backend returns 404
 *   when the user has no attempts at all, and an empty `data[]`
 *   when the filter has no matches. Both must resolve to
 *   `hasCompletedAttempt: false`, not as an error.
 *
 * ## Auth
 *
 * The hook is gated on `useAuthSession`. The attempts service
 * requires auth, so the fetch never fires when the viewer is
 * unauthenticated or while the bootstrap is unresolved.
 *
 * ## Non-ownership
 *
 * - The hook does not implement any attempt lifecycle (start /
 *   submit / complete / abandon). It is a read-only eligibility
 *   query; the attempt write hooks live in Story 4.14 / 4.15.
 * - The hook does not paginate the attempt history. `limit: 1` is
 *   intentional — the gate only needs to know whether *any*
 *   completed attempt exists.
 *
 * ## Return shape
 *
 *   `{ hasCompletedAttempt, isLoading, error, retry }`.
 *   - `hasCompletedAttempt`: true when at least one completed
 *     attempt exists for the quiz. `false` until the first fetch
 *     resolves successfully.
 *   - `isLoading`: true while the fetch is in flight.
 *   - `error`: typed `ApiError` for retryable failures (429 / 5xx).
 *     `null` on success and 404.
 *   - `retry`: manual revalidation.
 */

'use client';

import { useCallback, useMemo } from 'react';

import { ApiError, useSingleWithRetry } from '@/lib/api';

import { listMyAttempts } from '@/features/attempts/services/attempts.service';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import {
  reviewQuizAttemptKey,
} from '@/features/reviews/types';

import type { AttemptSummaryResponseDto } from '@/lib/api/generated/schemas';

// ─── Wire shape (post-unwrap) ────────────────────────────────────────────────

/**
 * Subset of the SDK response the fetcher reads. The hook only
 * needs `data` (the attempt-summary list) to compute the
 * eligibility boolean — it never inspects the pagination metadata
 * because the eligibility read uses `limit: 1`.
 */
type ListMyAttemptsResponse = {
  data?: AttemptSummaryResponseDto[];
};

// ─── Public types ────────────────────────────────────────────────────────────

export interface UseCompletedQuizAttemptResult {
  /** True when at least one completed attempt exists for the quiz. */
  hasCompletedAttempt: boolean;
  /** True only while the fetch is in flight. */
  isLoading: boolean;
  /** Typed `ApiError` for retryable failures; `null` otherwise. */
  error: ApiError | null;
  /** Manual revalidation for the same quiz. */
  retry: () => Promise<void>;
}

export interface UseCompletedQuizAttemptParams {
  /** Quiz ID to check eligibility for. Pass `null` to disable. */
  quizId: string | null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Quiz-scoped completed-attempt eligibility read.
 *
 * @example
 *   const { hasCompletedAttempt, isLoading } = useCompletedQuizAttempt({
 *     quizId: 'uuid',
 *   });
 */
export function useCompletedQuizAttempt(
  params: UseCompletedQuizAttemptParams,
): UseCompletedQuizAttemptResult {
  const { quizId } = params;

  const { bootstrapState, currentUser } = useAuthSession();

  const sessionId = useMemo<string | null>(() => {
    if (bootstrapState !== 'authenticated') return null;
    if (!currentUser) return null;
    const id = (currentUser as { id?: string; userId?: string }).id
      ?? (currentUser as { userId?: string }).userId;
    return id ?? null;
  }, [bootstrapState, currentUser]);

  const key = useMemo(
    () =>
      quizId === null || sessionId === null
        ? null
        : reviewQuizAttemptKey(quizId, sessionId),
    [quizId, sessionId],
  );

  const fetcher = useMemo(
    () =>
      async ({
        signal,
      }: {
        signal: AbortSignal;
      }): Promise<boolean> => {
        if (quizId === null) {
          return false;
        }

        let raw: unknown;
        try {
          raw = await listMyAttempts({
            quizId,
            status: 'completed',
            limit: 1,
          });
        } catch (err) {
          // 404 means "no attempts at all" — eligibility is `false`.
          // 401 / 403 / 429 / 5xx propagate as typed errors so the
          // gate hook can map them to its `error` branch.
          if (err instanceof ApiError && err.status === 404) {
            return false;
          }
          throw err;
        }

        if (signal.aborted) {
          return false;
        }

        const envelope = raw as unknown as ListMyAttemptsResponse;
        const items = envelope.data ?? [];
        return items.length > 0;
      },
    [quizId],
  );

  const { data, isLoading, error, retry } = useSingleWithRetry<boolean>({
    key,
    fetcher,
  });

  const hasCompletedAttempt = data === true;

  const stableRetry = useCallback(async () => {
    await retry();
  }, [retry]);

  return {
    hasCompletedAttempt,
    isLoading,
    error,
    retry: stableRetry,
  };
}
