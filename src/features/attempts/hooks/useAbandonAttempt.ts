'use client';

/**
 * `useAbandonAttempt` — typed-confirmation abandon mutation hook.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.12.
 *
 * ## What this hook owns
 *
 * - Exposes a `confirm()` action the caller invokes only after the
 *    `<AttemptAbandonDialog />` (T-4.14.17) returns the user's typed
 *    confirmation.
 * - Fires the verified `abandonAttempt(attemptId)` mutation from
 *    `attempts.service.ts` exactly once per logical user intent.
 * - Preserves a 500 ms cooldown between consecutive invocations.
 * - Hydrates the runner store on success (`beginAbandon` →
 *    `recordAbandonSuccess`) so the picker transitions to terminal
 *    `abandoned`.
 * - Revalidates the active-attempt cache on success so a second tab
 *    renders the Start CTA again.
 * - Emits one server-confirmed `attempts/changed { kind: 'abandon' }`
 *    broadcast.
 * - Does NOT call `completeAttempt`. Completion belongs to Story
 *    4.15 — abandon is its own dedicated mutation.
 *
 * ## Outcome model
 *
 *   - `idle`        — no `confirm()` call has been issued yet.
 *   - `abandoning`  — the most recent call is in flight.
 *   - `success`     — server confirmed; the attempt is terminal.
 *   - `not_active`  — 409 ATTEMPT_NOT_ACTIVE; the attempt was
 *                    completed or already abandoned in another tab.
 *                    The runner should re-fetch the attempt detail
 *                    to expose its current terminal status.
 *   - `completed_remote` — server reports the attempt is now
 *                    `completed`; this is the cross-tab handoff
 *                    boundary. The runner should hand control to
 *                    the Story 4.15 surface without scoring.
 *   - `forbidden`   — 403 cross-user access.
 *   - `not_found`   — 404 attempt not found.
 *   - `retryable`   — 429 / 5xx.
 *   - `cooldown`    — most recent call was dropped.
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
  abandonAttempt,
} from '@/features/attempts/services/attempts.service';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { ATTEMPT_CACHE_KEYS } from '@/features/attempts/types/attempt-runner.types';
import {
  beginAbandon,
  recordAbandonSuccess,
  recordMutationFailure,
} from '@/features/attempts/stores/useAttemptsStore';
import {
  broadcastAttemptsChanged,
} from '@/lib/api/core/attempts-broadcast-channel';

// ─── Public types ────────────────────────────────────────────────────────────

export interface UseAbandonAttemptParams {
  /** Attempt id the abandon targets. */
  attemptId: string | null;
  /** Quiz version id the attempt belongs to. */
  quizVersionId: string | null;
}

export type AbandonAttemptOutcome =
  | { kind: 'idle' }
  | { kind: 'abandoning' }
  | { kind: 'success' }
  | { kind: 'not_active'; currentStatus: 'completed' | 'abandoned' | 'unknown' }
  | { kind: 'completed_remote' }
  | { kind: 'forbidden' }
  | { kind: 'not_found' }
  | { kind: 'retryable'; error: ApiError }
  | { kind: 'cooldown' };

export interface UseAbandonAttemptResult {
  /** `true` while the abandon mutation is in flight. */
  isPending: boolean;
  /** `true` while the cooldown window blocks a new call. */
  isCoolingDown: boolean;
  /** Latest typed outcome. `null` until the first call resolves. */
  outcome: AbandonAttemptOutcome | null;
  /** Latest typed error from a `retryable` outcome; otherwise `null`. */
  error: ApiError | null;
  /**
   * Trigger the abandon mutation. The caller wires this to the
   * `<AttemptAbandonDialog />`'s confirmed callback. Resolves to
   * the discriminated outcome. No-ops when auth is unresolved.
   */
  confirm: () => Promise<AbandonAttemptOutcome>;
  /** Reset `outcome` and `error`. */
  reset: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

const DEFAULT_COOLDOWN_MS = 500;

export function useAbandonAttempt(
  params: UseAbandonAttemptParams,
): UseAbandonAttemptResult {
  const { attemptId, quizVersionId } = params;

  const { bootstrapState, currentUser } = useAuthSession();

  const sessionId = useMemo<string | null>(() => {
    if (bootstrapState !== 'authenticated') return null;
    if (!currentUser) return null;
    const id = (currentUser as { id?: string; userId?: string }).id
      ?? (currentUser as { userId?: string }).userId;
    return id ?? null;
  }, [bootstrapState, currentUser]);

  const [outcome, setOutcome] = useState<AbandonAttemptOutcome | null>(null);
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

  const confirm = useCallback(async (): Promise<AbandonAttemptOutcome> => {
    if (
      sessionId === null
      || attemptId === null
      || quizVersionId === null
    ) {
      return { kind: 'idle' };
    }

    // Cooldown gate.
    const now = Date.now();
    if (now - lastInvocationRef.current < DEFAULT_COOLDOWN_MS) {
      const dropped: AbandonAttemptOutcome = { kind: 'cooldown' };
      setOutcome(dropped);
      return dropped;
    }
    lastInvocationRef.current = now;

    setIsPending(true);
    setError(null);
    setOutcome({ kind: 'abandoning' });
    beginAbandon(attemptId, quizVersionId, sessionId);

    try {
      await abandonAttempt(attemptId);

      recordAbandonSuccess(attemptId, quizVersionId, sessionId);

      // Revalidate the active-attempt cache so a second tab renders
      // the Start CTA again.
      await Promise.all([
        globalMutate(ATTEMPT_CACHE_KEYS.active(quizVersionId, sessionId)),
        globalMutate(ATTEMPT_CACHE_KEYS.detail(attemptId, sessionId)),
      ]);

      broadcastAttemptsChanged({
        userId: sessionId,
        attemptId,
        kind: 'abandon',
      });

      const successOutcome: AbandonAttemptOutcome = { kind: 'success' };
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
      // 409 ATTEMPT_NOT_ACTIVE — the attempt itself is no longer
      // active. Refresh the attempt detail so the runner exposes its
      // current terminal status. If the server reports `completed`
      // the runner hands control to Story 4.15; otherwise the
      // attempt was abandoned in another tab and we treat the local
      // state as converged.
      if (
        isApiError(cause)
        && cause.status === 409
        && cause.code === 'ATTEMPT_NOT_ACTIVE'
      ) {
        await globalMutate(
          ATTEMPT_CACHE_KEYS.detail(attemptId, sessionId),
        );
        recordAbandonSuccess(attemptId, quizVersionId, sessionId);
        // The status field is opaque from the typed error; we surface
        // `unknown` here and let the runner re-read the attempt detail
        // to discover the terminal status.
        const notActive: AbandonAttemptOutcome = {
          kind: 'not_active',
          currentStatus: 'unknown',
        };
        setOutcome(notActive);
        setIsPending(false);
        return notActive;
      }

      // 409 ATTEMPT_NOT_COMPLETED / completed-side completion events
      // are not handled here — abandon must never call complete.
      // We surface `completed_remote` only when the backend explicitly
      // tells us the attempt is `completed` (e.g. via the conflict's
      // extensions). For now, the runner reads the detail cache after
      // `not_active` to discover the terminal status.

      // 403 — forbidden cross-user access.
      if (isApiError(cause) && cause.status === 403) {
        recordMutationFailure(
          attemptId,
          quizVersionId,
          sessionId,
          cause,
          'in_progress',
        );
        const forbidden: AbandonAttemptOutcome = { kind: 'forbidden' };
        setOutcome(forbidden);
        setIsPending(false);
        return forbidden;
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
        const notFound: AbandonAttemptOutcome = { kind: 'not_found' };
        setOutcome(notFound);
        setIsPending(false);
        return notFound;
      }

      // 429 / 5xx / network — surface the typed error so the UI
      // offers a retry. Preserve the attempt's `in_progress` status
      // so the runner stays interactive.
      const apiError = isApiError(cause)
        ? cause
        : new ApiError({ message: 'abandon_attempt_failed', status: 0 });
      setError(apiError);
      recordMutationFailure(
        attemptId,
        quizVersionId,
        sessionId,
        apiError,
        'in_progress',
      );
      const retryable: AbandonAttemptOutcome = {
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
    confirm,
    reset,
  };
}