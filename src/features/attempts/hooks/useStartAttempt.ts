'use client';

/**
 * `useStartAttempt` — single-active-aware start attempt mutation hook.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.9.
 *
 * ## What this hook owns
 *
 * - Fires the verified `startAttempt(quizId, payload)` mutation from
 *   `attempts.service.ts` exactly once per logical user intent.
 * - Handles the 409 `ATTEMPT_ALREADY_STARTED` outcome as a typed
 *   `already_started` outcome (with active revalidation) instead of
 *   a generic error.
 * - Handles the 422 `ATTEMPT_QUIZ_NOT_PUBLISHED` outcome as a typed
 *   `quiz_unpublished` outcome for the entry surface.
 * - Preserves a 500 ms cooldown between consecutive invocations so a
 *   rapid double click cannot fire two parallel start requests.
 * - Hydrates the runner store on success so the runner transitions
 *   from `starting` → `in_progress` with a server-confirmed snapshot.
 * - Emits one server-confirmed `attempts/changed` broadcast on
 *   success so remote tabs can revalidate.
 * - Auth-gates so unauthenticated callers never fire a request.
 *
 * ## Outcome model
 *
 * The hook returns a discriminated union so the runner can switch
 * exhaustively without inspecting raw `ApiError.code`:
 *
 *   - `idle`        — no `start()` call has been issued yet.
 *   - `starting`    — the most recent call is in flight.
 *   - `success`     — server confirmed; `attemptId` populated.
 *   - `already_started` — 409 from server (caller should re-read
 *                          active attempt and offer Continue).
 *   - `quiz_unpublished` — 422 from server (caller should hide the
 *                          Start CTA entirely).
 *   - `retryable`   — 429/5xx with typed `ApiError`.
 *   - `cooldown`    — most recent call was dropped because it landed
 *                     inside the cooldown window of a prior call.
 *
 * ## Auth
 *
 * The hook short-circuits to `idle` when auth is unresolved or the
 * viewer is unauthenticated. The Start CTA consumer wires `start()`
 * to a button that is `disabled` while `isPending` is true.
 *
 * ## Cross-tab broadcast
 *
 * On success the hook emits `attempts/changed { kind: 'start' }` so
 * the cross-tab reconciliation adapter (T-4.14.8) in receiving tabs
 * can revalidate the active-attempt cache and converge their
 * runner state.
 *
 * @see attempts.service.ts (T-4.14.1) — the wire call.
 * @see useAttemptsStore (T-4.14.7) — the runner state bag.
 * @see useAttemptCrossTabSync (T-4.14.8) — the receiving adapter.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';

import { ApiError, isApiError } from '@/lib/api';

import {
  startAttempt,
} from '@/features/attempts/services/attempts.service';
import { useAuthBootstrap } from '@/features/auth/contexts/auth-bootstrap-context';
import {
  ATTEMPT_CACHE_KEYS,
  type AttemptRunnerStatus,
} from '@/features/attempts/types/attempt-runner.types';
import {
  hydrateAttemptEntry,
  setAttemptStatus,
} from '@/features/attempts/stores/useAttemptsStore';
import {
  broadcastAttemptsChanged,
} from '@/lib/api/core/attempts-broadcast-channel';

import type { StartAttemptDto } from '@/lib/api/generated/schemas';

// ─── Public types ────────────────────────────────────────────────────────────

export interface UseStartAttemptParams {
  /**
   * Quiz identifier the Start CTA targets. Pass `null` to disable
   * the hook (e.g. before the viewer has picked a quiz).
   */
  quizId: string | null;
  /**
   * Optional body forwarded to the service. Defaults to `{}` so the
   * solo-context payload is the empty object.
   */
  payload?: StartAttemptDto;
}

export type StartAttemptOutcome =
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'success'; attemptId: string }
  | { kind: 'already_started'; attemptId: string | null }
  | { kind: 'quiz_unpublished' }
  | { kind: 'retryable'; error: ApiError }
  | { kind: 'cooldown' };

export interface UseStartAttemptResult {
  /** `true` while the start mutation is in flight. */
  isPending: boolean;
  /** `true` while the cooldown window blocks a new call. */
  isCoolingDown: boolean;
  /** Latest typed outcome. `null` until the first call resolves. */
  outcome: StartAttemptOutcome | null;
  /**
   * Latest typed error from a `retryable` outcome; otherwise `null`.
   * The runner surfaces this via the inline / toast error mapper.
   */
  error: ApiError | null;
  /**
   * Trigger a start. Resolves to the discriminated outcome. No-ops
   * when auth is unresolved, the viewer is unauthenticated, or the
   * hook is in cooldown.
   */
  start: () => Promise<StartAttemptOutcome>;
  /** Reset `outcome` and `error`. Useful for navigating away. */
  reset: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

const DEFAULT_COOLDOWN_MS = 500;

export function useStartAttempt(
  params: UseStartAttemptParams,
): UseStartAttemptResult {
  const { quizId, payload } = params;

  const { bootstrapState, currentUser } = useAuthBootstrap();

  const sessionId = useMemo<string | null>(() => {
    if (bootstrapState !== 'authenticated') return null;
    if (!currentUser) return null;
    const id = (currentUser as { id?: string; userId?: string }).id
      ?? (currentUser as { userId?: string }).userId;
    return id ?? null;
  }, [bootstrapState, currentUser]);

  const [outcome, setOutcome] = useState<StartAttemptOutcome | null>(null);
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

  const start = useCallback(async (): Promise<StartAttemptOutcome> => {
    // ─── Auth gate ────────────────────────────────────────────────
    if (sessionId === null || quizId === null) {
      return { kind: 'idle' };
    }

    // ─── Cooldown gate ────────────────────────────────────────────
    const now = Date.now();
    if (now - lastInvocationRef.current < DEFAULT_COOLDOWN_MS) {
      const dropped: StartAttemptOutcome = { kind: 'cooldown' };
      setOutcome(dropped);
      return dropped;
    }
    lastInvocationRef.current = now;

    setIsPending(true);
    setError(null);
    setOutcome({ kind: 'starting' });

    let resultAttemptId: string | null = null;

    try {
      const wire = (await startAttempt(
        quizId,
        payload ?? {},
      )) as unknown as { data?: { attemptId?: string } };
      resultAttemptId = wire?.data?.attemptId ?? null;

      // Hydrate the runner store with the canonical server snapshot.
      // We deliberately do NOT write a placeholder attemptId — the
      // server-confirmed id is the only identity the runner accepts.
      if (resultAttemptId !== null) {
        const status: AttemptRunnerStatus = 'in_progress';
        setAttemptStatus(
          resultAttemptId,
          quizId,
          sessionId,
          status,
        );
        hydrateAttemptEntry(resultAttemptId, quizId, sessionId, { status });
      }

      // Revalidate the active-attempt cache so a second tab renders
      // Continue within the ~1 s target.
      await globalMutate(ATTEMPT_CACHE_KEYS.active(quizId, sessionId));

      // Emit one cross-tab broadcast. Same-tab suppression is
      // handled by the channel layer.
      if (resultAttemptId !== null) {
        broadcastAttemptsChanged({
          userId: sessionId,
          attemptId: resultAttemptId,
          kind: 'start',
        });
      }

      const successOutcome: StartAttemptOutcome = {
        kind: 'success',
        attemptId: resultAttemptId ?? '',
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
      // 409 — the server reports the user already has an active
      // attempt. Revalidate the active lookup and surface a typed
      // outcome; do not raise an error.
      if (isApiError(cause) && cause.status === 409) {
        await globalMutate(ATTEMPT_CACHE_KEYS.active(quizId, sessionId));
        const concurrent: StartAttemptOutcome = {
          kind: 'already_started',
          attemptId: null,
        };
        setOutcome(concurrent);
        setIsPending(false);
        return concurrent;
      }

      // 422 — quiz is not published. Surface a typed outcome so the
      // entry surface can hide the Start CTA.
      if (isApiError(cause) && cause.status === 422) {
        const blocked: StartAttemptOutcome = { kind: 'quiz_unpublished' };
        setOutcome(blocked);
        setIsPending(false);
        return blocked;
      }

      // 429 / 5xx / network — surface the typed error so the UI can
      // offer a retry path. The cooldown still applies so a rapid
      // double click doesn't keep firing.
      const apiError = isApiError(cause)
        ? cause
        : new ApiError({ message: 'start_attempt_failed', status: 0 });
      setError(apiError);
      const retryable: StartAttemptOutcome = {
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
  }, [sessionId, quizId, payload]);

  return {
    isPending,
    isCoolingDown,
    outcome,
    error,
    start,
    reset,
  };
}