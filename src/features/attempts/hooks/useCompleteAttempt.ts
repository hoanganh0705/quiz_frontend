'use client';

/**
 * `useCompleteAttempt` — single-active-aware complete-attempt mutation hook.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.5.
 *
 * ## What this hook owns
 *
 * - Fires the verified `completeAttempt(attemptId)` mutation from
 *   `attempts.service.ts` exactly once per logical user intent.
 * - Handles the 403 `ATTEMPT_NOT_ACTIVE` outcome as a typed
 *   `not_active` outcome (the runner swaps to the result view
 *   without toast spam per Story 4.15 §Error Handling).
 * - Handles the 404 `ATTEMPT_NOT_FOUND` and 403 `ATTEMPT_FORBIDDEN`
 *   outcomes as a typed `redirect` outcome so the result page can
 *   toast + redirect to `/quizzes`.
 * - Handles the 422 `ATTEMPT_VALIDATION_FAILED` outcome as a typed
 *   `validation` outcome (the inline banner "Submit at least one
 *   answer" from T-4.15.4) and keeps the runner mounted.
 * - Preserves a 500 ms cooldown between consecutive invocations so a
 *   rapid double click cannot fire two parallel complete requests.
 * - Clears the runner's transient `error` and `cooldown` fields via
 *   the existing `hydrateAttemptEntry` partial snapshot so the next
 *   mutation primitive starts from a clean slate. The dedicated
 *   `recordCompletionSuccess` store action that writes the
 *   terminal `completed` state is reserved for T-4.15.15.
 * - Revalidates the active-attempt, detail, answers, result,
 *   history-list, and history-stats caches on success so every
 *   consumer renders fresh server data.
 * - Emits one server-confirmed `attempts/changed` broadcast on
 *   success with `kind: 'complete'` so remote tabs can revalidate
 *   without retriggering the completion mutation (T-4.15.7).
 * - Auth-gates so unauthenticated callers never fire a request.
 *
 * ## Outcome model
 *
 * The hook returns a discriminated union so the runner can switch
 * exhaustively without inspecting raw `ApiError.code`:
 *
 *   - `idle`        — no `complete()` call has been issued yet.
 *   - `completing`  — the most recent call is in flight.
 *   - `success`     — server confirmed; the canonical result DTO
 *                     is available via `result`.
 *   - `not_active`  — 403 from server (caller should swap to the
 *                     result view without toast spam).
 *   - `redirect`    — 404 `ATTEMPT_NOT_FOUND` or 403
 *                     `ATTEMPT_FORBIDDEN` (caller should toast + redirect
 *                     to `/quizzes`).
 *   - `validation`  — 422 `ATTEMPT_VALIDATION_FAILED` (caller should
 *                     render the inline banner "Submit at least one
 *                     answer" and keep the runner mounted).
 *   - `retryable`   — 429/5xx with typed `ApiError`.
 *   - `cooldown`    — most recent call was dropped because it landed
 *                     inside the cooldown window of a prior call.
 *
 * ## Auth
 *
 * The hook short-circuits to `idle` when auth is unresolved or the
 * viewer is unauthenticated. The complete CTA consumer wires
 * `complete()` to a button that is `disabled` while `isPending` is
 * true and only invokes `complete()` after the typed-confirm dialog
 * resolves positively (T-4.15.12 result page composition).
 *
 * ## Cross-tab broadcast
 *
 * On success the hook emits `attempts/changed { kind: 'complete' }`
 * so the cross-tab reconciliation adapter (T-4.15.7) in receiving
 * tabs can revalidate the result, history-list, and history-stats
 * caches without auto-navigating to the result page.
 *
 * @see attempts.service.ts (T-4.15.1) — the wire call.
 * @see useAttemptsStore (T-4.14.7) — the runner state bag.
 * @see useAttemptCrossTabSync (T-4.15.7) — the receiving adapter.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';

import { ApiError, isApiError } from '@/lib/api';

import {
  completeAttempt as completeAttemptService,
} from '@/features/attempts/services/attempts.service';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import {
  ATTEMPT_CACHE_KEYS,
} from '@/features/attempts/types/attempt-runner.types';
import {
  ATTEMPT_RESULT_CACHE_KEYS,
} from '@/features/attempts/types/attempt-result.types';
import {
  hydrateAttemptEntry,
} from '@/features/attempts/stores/useAttemptsStore';
import {
  broadcastAttemptsChanged,
} from '@/lib/api/core/attempts-broadcast-channel';

import type {
  CompleteAttemptResponseDto,
} from '@/lib/api/generated/schemas';

// ─── Public types ────────────────────────────────────────────────────────────

export interface UseCompleteAttemptParams {
  /**
   * Attempt identifier the complete CTA targets. Pass `null` to disable
   * the hook (e.g. before the runner has hydrated).
   */
  attemptId: string | null;
  /**
   * Quiz version id the runner is rendering. Used by the cache
   * revalidation to target the active-attempt key. Pass `null` to
   * disable the hook.
   */
  quizVersionId: string | null;
}

export type CompleteAttemptOutcome =
  | { kind: 'idle' }
  | { kind: 'completing' }
  | { kind: 'success'; result: CompleteAttemptResponseDto }
  | { kind: 'not_active' }
  | { kind: 'redirect'; target: '/quizzes'; error: ApiError }
  | { kind: 'validation'; error: ApiError }
  | { kind: 'retryable'; error: ApiError }
  | { kind: 'cooldown' };

export interface UseCompleteAttemptResult {
  /** `true` while the complete mutation is in flight. */
  isPending: boolean;
  /** `true` while the cooldown window blocks a new call. */
  isCoolingDown: boolean;
  /** Latest typed outcome. `null` until the first call resolves. */
  outcome: CompleteAttemptOutcome | null;
  /**
   * Latest typed error from a `redirect` / `validation` / `retryable`
   * outcome; otherwise `null`. The result page surfaces this via the
   * inline / toast error mapper.
   */
  error: ApiError | null;
  /**
   * Trigger a complete. Resolves to the discriminated outcome. No-ops
   * when auth is unresolved, the viewer is unauthenticated, or the
   * hook is in cooldown.
   */
  complete: () => Promise<CompleteAttemptOutcome>;
  /** Reset `outcome` and `error`. Useful for navigating away. */
  reset: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

const DEFAULT_COOLDOWN_MS = 500;

/**
 * Revalidate every cache key that depends on the completed attempt.
 *
 * Centralised so the success branch, the cross-tab reconciliation
 * adapter (T-4.15.7), and the eventual completion-store action
 * (T-4.15.15) all invalidate the same set. Mutating a generator
 * function targets every page that matches the predicate — SWR's
 * documented invalidation pattern.
 */
function revalidateAttemptCaches(
  attemptId: string,
  quizVersionId: string,
  sessionId: string,
): Promise<unknown>[] {
  const promises: Promise<unknown>[] = [
    // Story 4.14 keys the runner watches.
    globalMutate(ATTEMPT_CACHE_KEYS.active(quizVersionId, sessionId)),
    globalMutate(ATTEMPT_CACHE_KEYS.detail(attemptId, sessionId)),
    globalMutate(ATTEMPT_CACHE_KEYS.answers(attemptId, sessionId)),
    // Story 4.15 result cache the result page reads.
    globalMutate(ATTEMPT_RESULT_CACHE_KEYS.result(attemptId, sessionId)),
    // Story 4.15 history-list cache: invalidate every paginated page
    // by matching the session-scoped prefix. The pattern is the
    // documented SWR invalidation idiom.
    globalMutate(
      (key) =>
        Array.isArray(key) &&
        key[0] === 'attempts' &&
        key[1] === 'history' &&
        key[2] === sessionId,
      undefined,
      { revalidate: true },
    ),
    // Story 4.15 history-stats cache (placeholder for the future
    // stats hook — invalidating an absent key is a no-op).
    globalMutate(['attempts', 'history', 'stats', sessionId]),
  ];
  return promises;
}

export function useCompleteAttempt(
  params: UseCompleteAttemptParams,
): UseCompleteAttemptResult {
  const { attemptId, quizVersionId } = params;

  const { bootstrapState, currentUser } = useAuthSession();

  const sessionId = useMemo<string | null>(() => {
    if (bootstrapState !== 'authenticated') return null;
    if (!currentUser) return null;
    const id = (currentUser as { id?: string; userId?: string }).id
      ?? (currentUser as { userId?: string }).userId;
    return id ?? null;
  }, [bootstrapState, currentUser]);

  const [outcome, setOutcome] = useState<CompleteAttemptOutcome | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isPending, setIsPending] = useState<boolean>(false);
  const [isCoolingDown, setIsCoolingDown] = useState<boolean>(false);

  const lastInvocationRef = useRef<number>(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    setOutcome(null);
    setError(null);
    setIsPending(false);
    setIsCoolingDown(false);
  }, []);

  const complete = useCallback(async (): Promise<CompleteAttemptOutcome> => {
    // ─── Auth gate ────────────────────────────────────────────────
    if (sessionId === null || attemptId === null || quizVersionId === null) {
      return { kind: 'idle' };
    }

    // ─── Cooldown gate ────────────────────────────────────────────
    const now = Date.now();
    if (now - lastInvocationRef.current < DEFAULT_COOLDOWN_MS) {
      const dropped: CompleteAttemptOutcome = { kind: 'cooldown' };
      setOutcome(dropped);
      return dropped;
    }
    lastInvocationRef.current = now;

    setIsPending(true);
    setError(null);
    setOutcome({ kind: 'completing' });

    try {
      const result = await completeAttemptService(attemptId);

      // Clear the runner's transient error / cooldown fields so the
      // next mutation primitive starts from a clean slate. The
      // dedicated `recordCompletionSuccess` action that writes the
      // terminal `completed` state is reserved for T-4.15.15; this
      // hook stays within the approved T-4.15.5 scope.
      hydrateAttemptEntry(attemptId, quizVersionId, sessionId, {
        error: null,
        cooldownUntil: null,
      });

      // Revalidate every cache key that depends on the completed
      // attempt so every consumer renders fresh server data. The
      // revalidation is best-effort: a single cache-invalidate
      // failure must not block the cross-tab broadcast (T-4.15.7)
      // since remote tabs are the fallback path for stale cache.
      await Promise.all(
        revalidateAttemptCaches(attemptId, quizVersionId, sessionId),
      ).catch(() => {
        // Best-effort: swallow so the broadcast still fires.
      });

      // Emit one cross-tab broadcast. Same-tab suppression is
      // handled by the channel layer.
      broadcastAttemptsChanged({
        userId: sessionId,
        attemptId,
        kind: 'complete',
      });

      const successOutcome: CompleteAttemptOutcome = {
        kind: 'success',
        result,
      };
      setOutcome(successOutcome);
      setIsPending(false);
      setIsCoolingDown(true);
      if (cooldownTimerRef.current !== null) {
        clearTimeout(cooldownTimerRef.current);
      }
      cooldownTimerRef.current = setTimeout(() => {
        setIsCoolingDown(false);
      }, DEFAULT_COOLDOWN_MS);
      return successOutcome;
    } catch (cause: unknown) {
      // 403 ATTEMPT_NOT_ACTIVE — the runner swaps to the result view
      // without toast spam. Revalidate so a remote-tab completion
      // can converge the runner to the result page.
      if (
        isApiError(cause) &&
        cause.code === 'ATTEMPT_NOT_ACTIVE' &&
        (cause.status === 403 || cause.status === 409)
      ) {
        await Promise.all(
          revalidateAttemptCaches(attemptId, quizVersionId, sessionId),
        );
        const swapped: CompleteAttemptOutcome = { kind: 'not_active' };
        setOutcome(swapped);
        setIsPending(false);
        return swapped;
      }

      // 404 ATTEMPT_NOT_FOUND / 403 ATTEMPT_FORBIDDEN — toast +
      // redirect to /quizzes. We deliberately do NOT throw so the
      // runner can route away cleanly.
      if (
        isApiError(cause) &&
        (cause.code === 'ATTEMPT_NOT_FOUND' ||
          cause.code === 'ATTEMPT_FORBIDDEN')
      ) {
        setError(cause);
        const redirect: CompleteAttemptOutcome = {
          kind: 'redirect',
          target: '/quizzes',
          error: cause,
        };
        setOutcome(redirect);
        setIsPending(false);
        return redirect;
      }

      // 422 ATTEMPT_VALIDATION_FAILED — inline banner, runner stays.
      if (
        isApiError(cause) &&
        cause.code === 'ATTEMPT_VALIDATION_FAILED'
      ) {
        setError(cause);
        const validation: CompleteAttemptOutcome = {
          kind: 'validation',
          error: cause,
        };
        setOutcome(validation);
        setIsPending(false);
        return validation;
      }

      // 429 / 5xx / network — surface the typed error so the UI can
      // offer a retry path. The cooldown still applies so a rapid
      // double click doesn't keep firing.
      const apiError = isApiError(cause)
        ? cause
        : new ApiError({ message: 'complete_attempt_failed', status: 0 });
      setError(apiError);
      const retryable: CompleteAttemptOutcome = {
        kind: 'retryable',
        error: apiError,
      };
      setOutcome(retryable);
      setIsPending(false);
      setIsCoolingDown(true);
      if (cooldownTimerRef.current !== null) {
        clearTimeout(cooldownTimerRef.current);
      }
      cooldownTimerRef.current = setTimeout(() => {
        setIsCoolingDown(false);
      }, DEFAULT_COOLDOWN_MS);
      return retryable;
    }
  }, [sessionId, attemptId, quizVersionId]);

  return {
    isPending,
    isCoolingDown,
    outcome,
    error,
    complete,
    reset,
  };
}