'use client';

/**
 * `useActiveAttempt` — quiz-scoped active attempt lookup.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.5.
 *
 * ## What this hook owns
 *
 * - Resolves whether the authenticated user has an in-progress
 *   (`status: 'started'`) attempt for the published quiz version
 *   the Start CTA is rendered against.
 * - Calls the service-level `getActiveAttempt(quizId)` helper
 *   (T-4.14.1) which normalises the empty-page and 404 responses to
 *   `null` and propagates every other failure as a typed `ApiError`.
 * - Wraps the result in `useSingleWithRetry` (Epic 3.6) so the
 *   250/500/1000 ms 429 backoff policy and the manual `retry()`
 *   action are reused.
 * - Gated on `useAuthSession` so the private read never fires
 *   while the bootstrap is unresolved or the viewer is
 *   unauthenticated.
 * - Exposes an `attempt: AttemptSummaryResponseDto | null` field
 *   that the Start CTA branch consults to choose between Start and
 *   Continue.
 *
 * ## What this hook does NOT own
 *
 * - It does NOT call attempt analytics, attempt review, or the
 *   cursor-paginated attempt history. The runner's hydration hook
 *   (T-4.14.6) owns the detail + submitted-answers reads.
 * - It does NOT trigger a side-effecting attempt write (start /
 *   submit / withdraw / abandon). Those live in T-4.14.7+ and the
 *   mutation hooks they introduce.
 *
 * ## Return shape
 *
 *   `{ attempt, isLoading, error, retry }`.
 *   - `attempt`: the active `AttemptSummaryResponseDto` or `null`
 *     when none exists. Never `undefined` once the first fetch
 *     resolves.
 *   - `isLoading`: true only while the fetch is in flight.
 *   - `error`: typed `ApiError` for retryable / terminal failures;
 *     `null` on success or "no active attempt".
 *   - `retry`: manual revalidation for the same key.
 *
 * ## Auth
 *
 * The hook is safe to call with `quizId: null` or while the auth
 * bootstrap is unresolved — it returns a disabled state without
 * firing the service.
 */

import { useCallback, useMemo } from 'react';

import { ApiError, useSingleWithRetry } from '@/lib/api';

import { getActiveAttempt } from '@/features/attempts/services/attempts.service';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import {
  ATTEMPT_CACHE_KEYS,
  type ActiveAttemptView,
} from '@/features/attempts/types/attempt-runner.types';

import type { AttemptSummaryResponseDto } from '@/lib/api/generated/schemas';

// ─── Public types ────────────────────────────────────────────────────────────

export interface UseActiveAttemptParams {
  /**
   * Quiz identifier for the active-attempt lookup. Pass `null` to
   * disable the fetch (e.g. when the viewer has not yet picked a
   * quiz).
   */
  quizId: string | null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Quiz-scoped active attempt lookup.
 *
 * @example
 *   const { attempt, isLoading, error, retry } = useActiveAttempt({
 *     quizId: quizIdFromRoute,
 *   });
 */
export function useActiveAttempt(
  params: UseActiveAttemptParams,
): ActiveAttemptView {
  const { quizId } = params;

  const { bootstrapState, currentUser } = useAuthSession();

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
        : ATTEMPT_CACHE_KEYS.active(quizId, sessionId),
    [quizId, sessionId],
  );

  const fetcher = useMemo(
    () =>
      async ({
        signal,
      }: {
        signal: AbortSignal;
      }): Promise<AttemptSummaryResponseDto | null> => {
        if (quizId === null) {
          // Defensive: the key is null when this branch is taken, so
          // the primitive should not call the fetcher. Returning
          // `null` matches the disabled behaviour without throwing.
          return null;
        }
        const result = await getActiveAttempt(quizId);
        if (signal.aborted) {
          return result;
        }
        return result;
      },
    [quizId],
  );

  const { data, isLoading, error, retry } = useSingleWithRetry<
    AttemptSummaryResponseDto | null
  >({
    key,
    fetcher,
  });

  const stableRetry = useCallback(async () => {
    await retry();
  }, [retry]);

  return {
    attempt: data ?? null,
    isLoading,
    error,
    retry: stableRetry,
  };
}

// Re-export so consumers do not need to import `ApiError` separately
// when narrowing the hook's error field.
export type { ActiveAttemptView };
export { ApiError };