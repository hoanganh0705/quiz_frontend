'use client';

/**
 * `useAttemptResult` — canonical attempt-result read hook.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.6.
 *
 * ## What this hook owns
 *
 * - Issues `getAttemptResult(attemptId)` (T-4.15.1) for the canonical
 *   completed-attempt review projection.
 * - Returns `{ result, isLoading, hasResolved, error, refresh }` per
 *   the Story 4.15 §Acceptance Criteria.
 * - 200 → the documented `AttemptResultDto` projection.
 * - 404 → `result: null` (the attempt has no completed review yet —
 *   the runner may still be in progress). This is the documented
 *   "no result yet" projection.
 * - 401 / 403 / 429 / 5xx remain typed errors and are never
 *   misclassified as "no result yet".
 * - Cache is scoped by attempt id and the current authenticated
 *   session so a tab swap or attempt change invalidates the cached
 *   entry.
 * - Read-only — the hook never calls `completeAttempt`.
 * - Auth-gated — no fetch fires while auth is unresolved or the
 *   viewer is unauthenticated.
 *
 * ## Auth bootstrap loading
 *
 * While the auth bootstrap is in `loading`, the hook returns
 * `result: null` and `isLoading: false`. The result page reads
 * `hasResolved` to gate the loading skeleton; `hasResolved` stays
 * `false` until the bootstrap resolves to either `authenticated` or
 * `unauthenticated`.
 *
 * ## Reuse of primitives
 *
 * `useSingleWithRetry` (Epic 3.6) is the substrate. The hook reuses
 * its 250 / 500 / 1000 ms 429 backoff, abort-on-key-change, and
 * manual `retry()` action.
 *
 * @see attempts.service.ts (T-4.15.1) — the wire call.
 * @see useCompleteAttempt (T-4.15.5) — the mutation counterpart.
 */

import { useCallback, useMemo } from 'react';

import { ApiError, useSingleWithRetry } from '@/lib/api';

import {
  getAttemptResult,
} from '@/features/attempts/services/attempts.service';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import {
  ATTEMPT_RESULT_CACHE_KEYS,
  type AttemptResultDto,
} from '@/features/attempts/types/attempt-result.types';

// ─── Public types ────────────────────────────────────────────────────────────

export interface UseAttemptResultParams {
  /**
   * Attempt identifier to fetch the result for. Pass `null` to
   * disable the fetch (e.g. before the runner has hydrated).
   */
  attemptId: string | null;
}

export interface AttemptResultView {
  /**
   * Canonical completed-attempt review projection (`AttemptResultDto`),
   * or `null` when:
   *   - the attempt has no completed review yet (404 from the
   *     service);
   *   - the service envelope is missing the `data` field;
   *   - the hook is disabled (no `attemptId` or unauthenticated);
   *   - the auth bootstrap is still resolving.
   */
  result: AttemptResultDto | null;
  /**
   * `true` while a fetch is in flight. Disabled state and bootstrap
   * loading both report `isLoading: false`.
   */
  isLoading: boolean;
  /**
   * `true` once the first fetch settles (success, no-result, or
   * error) so the result page can gate its content without flashing
   * open before the first paint.
   */
  hasResolved: boolean;
  /**
   * Typed `ApiError` for non-404 failures, `null` otherwise. The
   * "no result yet" outcome resolves with `error: null` and
   * `result: null`.
   */
  error: ApiError | null;
  /**
   * Manual revalidation. Calls `useSingleWithRetry`'s `retry()`
   * so the 429 backoff is reused.
   */
  refresh: () => Promise<void>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAttemptResult(
  params: UseAttemptResultParams,
): AttemptResultView {
  const { attemptId } = params;

  const { bootstrapState, currentUser } = useAuthSession();

  const sessionId = useMemo<string | null>(() => {
    if (bootstrapState !== 'authenticated') return null;
    if (!currentUser) return null;
    const id = (currentUser as { id?: string; userId?: string }).id
      ?? (currentUser as { userId?: string }).userId;
    return id ?? null;
  }, [bootstrapState, currentUser]);

  // Auth + id gating: the cache key stays `null` while either is
  // unresolved so the fetcher never fires.
  const key = useMemo(
    () =>
      attemptId === null || sessionId === null
        ? null
        : ATTEMPT_RESULT_CACHE_KEYS.result(attemptId, sessionId),
    [attemptId, sessionId],
  );

  const fetcher = useMemo(
    () =>
      async ({
        signal,
      }: {
        signal: AbortSignal;
      }): Promise<AttemptResultDto | null> => {
        if (attemptId === null) return null;
        const wire = await getAttemptResult(attemptId);
        if (signal.aborted) return wire;
        return wire;
      },
    [attemptId],
  );

  const single = useSingleWithRetry<AttemptResultDto | null>({
    key,
    fetcher,
  });

  const hasResolved =
    !single.isLoading &&
    (single.data !== undefined || single.error !== null);

  const refresh = useCallback(async () => {
    await single.retry();
  }, [single.retry]);

  return {
    result: single.data ?? null,
    isLoading: single.isLoading,
    hasResolved,
    error: single.error,
    refresh,
  };
}