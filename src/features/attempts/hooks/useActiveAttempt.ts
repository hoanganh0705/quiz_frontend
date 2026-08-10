"use client";

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
 * - Backed by SWR so `globalMutate(ATTEMPT_CACHE_KEYS.active(...))`
 *   from `useStartAttempt` actually invalidates the cache and the
 *   `mutate(activeKey)` from `useAttemptCrossTabSync` converges the
 *   runner immediately after a Start. The cross-tab bug where the
 *   runner remounted and saw a stale `null` because the previous
 *   implementation bypassed the global SWR cache (it used the
 *   local-state `useSingleWithRetry` primitive) is closed by this
 *   change.
 * - Reuses the 250/500/1000 ms 429 backoff policy (Epic 3.6) via the
 *   SWR `errorRetryInterval` override, and exposes a manual
 *   `retry()` action for the UI's retry button.
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

import { useCallback, useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";

import { ApiError, isApiError } from "@/lib/api";

import { getActiveAttempt } from "@/features/attempts/services/attempts.service";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import {
  ATTEMPT_CACHE_KEYS,
  type ActiveAttemptView,
} from "@/features/attempts/types/attempt-runner.types";

import type { AttemptSummaryResponseDto } from "@/lib/api/generated/schemas";

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
    if (bootstrapState !== "authenticated") return null;
    if (!currentUser) return null;
    const id =
      (currentUser as { id?: string; userId?: string }).id ??
      (currentUser as { userId?: string }).userId;
    return id ?? null;
  }, [bootstrapState, currentUser]);

  // The SWR key drives both SWR identity and the "disabled"
  // sentinel. We pass `null` when any of (a) the quiz id is
  // missing, (b) auth bootstrap is not yet resolved, or (c) the
  // bootstrap produced no currentUser.
  const key = useMemo(
    () =>
      quizId === null || sessionId === null
        ? null
        : ATTEMPT_CACHE_KEYS.active(quizId, sessionId),
    [quizId, sessionId],
  );

  // Fetcher is stable while `quizId` is stable. SWR's `null` key
  // disables the fetch without calling the fetcher, so we don't
  // need to guard `quizId === null` inside the fetcher.
  //
  // The fetcher takes the SWR `ArgumentsTuple` (the spread key) so
  // the strict-key overload is selected.
  const fetcher = useMemo(
    () =>
      async (
        _args: readonly unknown[],
      ): Promise<AttemptSummaryResponseDto | null> => {
        if (quizId === null) return null;
        return await getActiveAttempt(quizId);
      },
    [quizId],
  );

  // SWR's `errorRetryInterval` is a constant `number`, not a
  // function — there is no per-retry schedule hook. We pick the
  // tightest bound from the Epic 3.6 250 / 500 / 1000 ms policy
  // so a 429 retries quickly (every 250 ms) instead of the
  // SWR-default 5 s exponential backoff. With `errorRetryCount: 3`
  // the three retries cost ~750 ms total, well within the
  // `useActiveAttempt` contract's 4 s error-surfacing window.
  const swrConfig = useMemo(
    () =>
      ({
        revalidateOnFocus: false,
        // Disable the SwrProvider default 2 s deduping window so a
        // freshly started attempt isn't deduped-out of an immediate
        // post-start revalidation triggered by `globalMutate(activeKey)`.
        dedupingInterval: 0,
        errorRetryInterval: 250,
      }) as const,
    [],
  );

  const swr = useSWR<AttemptSummaryResponseDto | null>(key, fetcher, swrConfig);

  const stableRetry = useCallback(async (): Promise<void> => {
    if (key === null) return;
    await globalMutate(key);
  }, [key]);

  // Coerce SWR's `unknown` error into the typed `ApiError` the
  // public contract exposes. The service layer already produces
  // `ApiError` instances for every failure shape, so non-ApiError
  // throws should never reach here — but we coerce defensively so
  // the public type stays narrow.
  const error: ApiError | null = swr.error
    ? isApiError(swr.error)
      ? swr.error
      : new ApiError({
          message: "useActiveAttempt_unexpected_error",
          status: 0,
        })
    : null;

  return {
    attempt: swr.data ?? null,
    isLoading: swr.isLoading,
    error,
    retry: stableRetry,
  };
}

// Re-export so consumers do not need to import `ApiError` separately
// when narrowing the hook's error field.
export type { ActiveAttemptView };
export { ApiError };
