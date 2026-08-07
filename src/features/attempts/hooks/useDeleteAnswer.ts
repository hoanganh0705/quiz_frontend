'use client';

/**
 * `useDeleteAnswer` — answer-withdrawal mutation hook.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.11.
 *
 * ## What this hook owns
 *
 * - Fires the verified `withdrawAnswer(attemptId, questionId)`
 *   mutation from `attempts.service.ts` exactly once per logical
 *   user intent.
 * - Preserves a 500 ms cooldown between consecutive invocations.
 * - On 404 `ATTEMPT_ANSWER_NOT_FOUND`, treats the outcome as
 *   `already_missing` (silent — no toast) and converges the local
 *   lock to the unanswered state.
 * - Distinguishes 404 `ATTEMPT_NOT_FOUND` from 404 `ATTEMPT_ANSWER_NOT_FOUND`
 *   so the runner renders the correct copy.
 * - Emits one server-confirmed `attempts/changed { kind: 'withdraw' }`
 *   broadcast on success.
 *
 * ## Why the name
 *
 * The hook is named `useDeleteAnswer` to mirror the Epic 4.14
 * user-facing "Delete answer" affordance. The wire-level SDK
 * operation is `withdrawAnswer` (the per-question withdrawal call),
 * but the hook exposes the user-facing vocabulary. The store's
 * helper `recordWithdrawSuccess` aligns with the same naming
 * convention.
 *
 * ## Outcome model
 *
 *   - `idle`           — no `withdraw()` call has been issued yet.
 *   - `withdrawing`    — the most recent call is in flight.
 *   - `success`        — server confirmed; the lock is removed.
 *   - `already_missing` — 404 ATTEMPT_ANSWER_NOT_FOUND (silent).
 *   - `not_found`      — 404 ATTEMPT_NOT_FOUND (rare — attempt itself
 *                        is gone).
 *   - `not_active`     — 409 ATTEMPT_NOT_ACTIVE.
 *   - `forbidden`      — 403 cross-user access.
 *   - `retryable`      — 429 / 5xx; the lock is preserved.
 *   - `cooldown`       — most recent call was dropped.
 *
 * ## Auth + session
 *
 * The hook derives the session id from `useAuthSession`. The
 * mutation only fires when bootstrap is `authenticated` and the
 * caller has provided both `attemptId` and `quizVersionId`.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';

import { ApiError, isApiError } from '@/lib/api';

import {
  withdrawAnswer,
} from '@/features/attempts/services/attempts.service';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { ATTEMPT_CACHE_KEYS } from '@/features/attempts/types/attempt-runner.types';
import {
  recordMutationFailure,
  recordWithdrawSuccess,
} from '@/features/attempts/stores/useAttemptsStore';
import {
  broadcastAttemptsChanged,
} from '@/lib/api/core/attempts-broadcast-channel';

// ─── Public types ────────────────────────────────────────────────────────────

export interface UseDeleteAnswerParams {
  /** Attempt id the withdrawal targets. */
  attemptId: string | null;
  /** Quiz version id the attempt belongs to. */
  quizVersionId: string | null;
}

export type DeleteAnswerOutcome =
  | { kind: 'idle' }
  | { kind: 'withdrawing' }
  | { kind: 'success'; questionId: string }
  | { kind: 'already_missing'; questionId: string }
  | { kind: 'not_found' }
  | { kind: 'not_active' }
  | { kind: 'forbidden' }
  | { kind: 'retryable'; error: ApiError }
  | { kind: 'cooldown' };

export interface UseDeleteAnswerResult {
  /** `true` while the withdrawal mutation is in flight. */
  isPending: boolean;
  /** `true` while the cooldown window blocks a new call. */
  isCoolingDown: boolean;
  /** Latest typed outcome. `null` until the first call resolves. */
  outcome: DeleteAnswerOutcome | null;
  /** Latest typed error from a `retryable` outcome; otherwise `null`. */
  error: ApiError | null;
  /**
   * Withdraw one submitted answer. Resolves to the discriminated
   * outcome. No-ops when auth is unresolved or required identities
   * are missing.
   */
  withdraw: (questionId: string) => Promise<DeleteAnswerOutcome>;
  /** Reset `outcome` and `error`. */
  reset: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

const DEFAULT_COOLDOWN_MS = 500;

export function useDeleteAnswer(
  params: UseDeleteAnswerParams,
): UseDeleteAnswerResult {
  const { attemptId, quizVersionId } = params;

  const { bootstrapState, currentUser } = useAuthSession();

  const sessionId = useMemo<string | null>(() => {
    if (bootstrapState !== 'authenticated') return null;
    if (!currentUser) return null;
    const id = (currentUser as { id?: string; userId?: string }).id
      ?? (currentUser as { userId?: string }).userId;
    return id ?? null;
  }, [bootstrapState, currentUser]);

  const [outcome, setOutcome] = useState<DeleteAnswerOutcome | null>(null);
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

  const withdraw = useCallback(
    async (questionId: string): Promise<DeleteAnswerOutcome> => {
      if (
        sessionId === null
        || attemptId === null
        || quizVersionId === null
        || !questionId
      ) {
        return { kind: 'idle' };
      }

      // Cooldown gate.
      const now = Date.now();
      if (now - lastInvocationRef.current < DEFAULT_COOLDOWN_MS) {
        const dropped: DeleteAnswerOutcome = { kind: 'cooldown' };
        setOutcome(dropped);
        return dropped;
      }
      lastInvocationRef.current = now;

      setIsPending(true);
      setError(null);
      setOutcome({ kind: 'withdrawing' });

      try {
        await withdrawAnswer(attemptId, questionId);

        recordWithdrawSuccess(
          attemptId,
          quizVersionId,
          sessionId,
          questionId,
        );

        // Revalidate the canonical answers cache so the runner's lock
        // set is refreshed from the server.
        await globalMutate(
          ATTEMPT_CACHE_KEYS.answers(attemptId, sessionId),
        );

        broadcastAttemptsChanged({
          userId: sessionId,
          attemptId,
          kind: 'withdraw',
        });

        const successOutcome: DeleteAnswerOutcome = {
          kind: 'success',
          questionId,
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
        // 404 ATTEMPT_ANSWER_NOT_FOUND — server says the answer is
        // already gone. Clear the local lock and surface a silent
        // outcome (no toast).
        if (
          isApiError(cause)
          && cause.status === 404
          && cause.code === 'ATTEMPT_ANSWER_NOT_FOUND'
        ) {
          recordWithdrawSuccess(
            attemptId,
            quizVersionId,
            sessionId,
            questionId,
          );
          await globalMutate(
            ATTEMPT_CACHE_KEYS.answers(attemptId, sessionId),
          );
          const silent: DeleteAnswerOutcome = {
            kind: 'already_missing',
            questionId,
          };
          setOutcome(silent);
          setIsPending(false);
          return silent;
        }

        // 404 ATTEMPT_NOT_FOUND — the attempt itself is gone.
        if (
          isApiError(cause)
          && cause.status === 404
          && cause.code === 'ATTEMPT_NOT_FOUND'
        ) {
          recordMutationFailure(
            attemptId,
            quizVersionId,
            sessionId,
            cause,
            'idle',
          );
          const notFound: DeleteAnswerOutcome = { kind: 'not_found' };
          setOutcome(notFound);
          setIsPending(false);
          return notFound;
        }

        // 409 ATTEMPT_NOT_ACTIVE — the attempt is no longer active.
        if (
          isApiError(cause)
          && cause.status === 409
          && cause.code === 'ATTEMPT_NOT_ACTIVE'
        ) {
          recordMutationFailure(
            attemptId,
            quizVersionId,
            sessionId,
            cause,
            'in_progress',
          );
          const notActive: DeleteAnswerOutcome = { kind: 'not_active' };
          setOutcome(notActive);
          setIsPending(false);
          return notActive;
        }

        // 403 — forbidden cross-user access.
        if (isApiError(cause) && cause.status === 403) {
          recordMutationFailure(
            attemptId,
            quizVersionId,
            sessionId,
            cause,
            'in_progress',
          );
          const forbidden: DeleteAnswerOutcome = { kind: 'forbidden' };
          setOutcome(forbidden);
          setIsPending(false);
          return forbidden;
        }

        // 429 / 5xx / network — preserve the existing submitted lock
        // and surface the typed error so the UI offers a retry.
        const apiError = isApiError(cause)
          ? cause
          : new ApiError({ message: 'withdraw_answer_failed', status: 0 });
        setError(apiError);
        recordMutationFailure(
          attemptId,
          quizVersionId,
          sessionId,
          apiError,
          'in_progress',
        );
        const retryable: DeleteAnswerOutcome = {
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
    },
    [sessionId, attemptId, quizVersionId],
  );

  return {
    isPending,
    isCoolingDown,
    outcome,
    error,
    withdraw,
    reset,
  };
}