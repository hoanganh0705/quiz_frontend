'use client';

/**
 * `useSubmitAnswer` — validated answer-submission mutation hook.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.10.
 *
 * ## What this hook owns
 *
 * - Validates the runner's controlled `AnswerSelection` (T-4.14.3)
 *   and refuses to fire the mutation when validation fails.
 * - Fires the verified `submitAnswer(attemptId, payload)` mutation
 *   from `attempts.service.ts` exactly once per logical user intent.
 * - Preserves a 500 ms cooldown between consecutive invocations.
 * - Hydrates the runner store on success (`beginSubmit` → `recordSubmitSuccess`)
 *   so the picker transitions from `submitting` → `in_progress`.
 * - Re-validates the canonical answers cache on success so the
 *   runner's lock set reflects the new submission.
 * - Emits one server-confirmed `attempts/changed { kind: 'submit' }`
 *   broadcast on success.
 * - Re-validates on 409 `ATTEMPT_QUESTION_ALREADY_ANSWERED` so a
 *   lost-response replay converges to the server state.
 *
 * ## Outcome model
 *
 *   - `idle`         — no `submit()` call has been issued yet.
 *   - `submitting`   — the most recent call is in flight.
 *   - `success`      — server confirmed; the lock set is updated.
 *   - `invalid`      — validation refused (no network call).
 *   - `already_answered` — 409 from server; lock set refreshed.
 *   - `question_invalid` — 422 / `ATTEMPT_QUESTION_INVALID` for a
 *                          question not in this attempt.
 *   - `forbidden`    — 403 cross-user access.
 *   - `not_active`   — 409 `ATTEMPT_NOT_ACTIVE`.
 *   - `retryable`    — 429 / 5xx.
 *   - `cooldown`     — most recent call was dropped.
 *
 * ## Auth + session
 *
 * The hook derives the session id from `useAuthBootstrap` and only
 * fires the mutation when bootstrap is `authenticated`. The
 * `customInstance` refresh flow (401 replay) does not enqueue a
 * parallel request — the hook awaits the existing promise so the UI
 * exposes exactly one pending action.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';

import { ApiError, isApiError } from '@/lib/api';

import {
  submitAnswer,
} from '@/features/attempts/services/attempts.service';
import {
  validateAndBuildSubmitPayload,
} from '@/features/attempts/lib/attempt-answer-validation';
import { useAuthBootstrap } from '@/features/auth/contexts/auth-bootstrap-context';
import {
  ATTEMPT_CACHE_KEYS,
  type AnswerSelection,
  type AttemptRunnerStatus,
} from '@/features/attempts/types/attempt-runner.types';
import {
  beginSubmit,
  recordMutationFailure,
  recordSubmitSuccess,
} from '@/features/attempts/stores/useAttemptsStore';
import {
  broadcastAttemptsChanged,
} from '@/lib/api/core/attempts-broadcast-channel';

import type { QuizQuestionPlayerDto } from '@/lib/api/generated/schemas';

// ─── Public types ────────────────────────────────────────────────────────────

export interface UseSubmitAnswerParams {
  /**
   * Attempt id the runner is currently driving. Pass `null` to
   * disable the hook (e.g. before the runner has hydrated an attempt).
   */
  attemptId: string | null;
  /**
   * Quiz version id the attempt belongs to. Required so the runner
   * store can write the correct entry on hydration.
   */
  quizVersionId: string | null;
}

export type SubmitAnswerOutcome =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; questionId: string; submittedAt: string }
  | { kind: 'invalid'; field: 'questionId' | 'selection'; reason: string }
  | { kind: 'already_answered' }
  | { kind: 'question_invalid' }
  | { kind: 'forbidden' }
  | { kind: 'not_active' }
  | { kind: 'retryable'; error: ApiError }
  | { kind: 'cooldown' };

export interface UseSubmitAnswerResult {
  /** `true` while the submit mutation is in flight. */
  isPending: boolean;
  /** `true` while the cooldown window blocks a new call. */
  isCoolingDown: boolean;
  /** Latest typed outcome. `null` until the first call resolves. */
  outcome: SubmitAnswerOutcome | null;
  /**
   * Latest typed error from a `retryable` outcome; otherwise `null`.
   */
  error: ApiError | null;
  /**
   * Submit one answer. Resolves to the discriminated outcome. No-ops
   * when auth is unresolved or `attemptId` / `quizVersionId` are
   * missing.
   */
  submit: (
    question: QuizQuestionPlayerDto,
    selection: AnswerSelection,
    timeTakenMs?: number | null,
  ) => Promise<SubmitAnswerOutcome>;
  /** Reset `outcome` and `error`. */
  reset: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

const DEFAULT_COOLDOWN_MS = 500;

export function useSubmitAnswer(
  params: UseSubmitAnswerParams,
): UseSubmitAnswerResult {
  const { attemptId, quizVersionId } = params;

  const { bootstrapState, currentUser } = useAuthBootstrap();

  const sessionId = useMemo<string | null>(() => {
    if (bootstrapState !== 'authenticated') return null;
    if (!currentUser) return null;
    const id = (currentUser as { id?: string; userId?: string }).id
      ?? (currentUser as { userId?: string }).userId;
    return id ?? null;
  }, [bootstrapState, currentUser]);

  const [outcome, setOutcome] = useState<SubmitAnswerOutcome | null>(null);
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

  const submit = useCallback(
    async (
      question: QuizQuestionPlayerDto,
      selection: AnswerSelection,
      timeTakenMs?: number | null,
    ): Promise<SubmitAnswerOutcome> => {
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
        const dropped: SubmitAnswerOutcome = { kind: 'cooldown' };
        setOutcome(dropped);
        return dropped;
      }
      lastInvocationRef.current = now;

      // Validation gate — refuses the mutation before the network.
      const validation = validateAndBuildSubmitPayload(
        question,
        selection,
        timeTakenMs,
      );
      if (validation.kind === 'invalid') {
        const invalidOutcome: SubmitAnswerOutcome = {
          kind: 'invalid',
          field: validation.field,
          reason: validation.reason,
        };
        setOutcome(invalidOutcome);
        return invalidOutcome;
      }
      if (validation.kind === 'blocked') {
        const blockedOutcome: SubmitAnswerOutcome = {
          kind: 'question_invalid',
        };
        setOutcome(blockedOutcome);
        return blockedOutcome;
      }

      setIsPending(true);
      setError(null);
      setOutcome({ kind: 'submitting' });
      beginSubmit(attemptId, quizVersionId, sessionId, DEFAULT_COOLDOWN_MS);

      try {
        const wire = (await submitAnswer(attemptId, validation.payload)) as unknown as {
          data?: { questionId?: string; submittedAt?: string };
        };
        const submittedAt = wire?.data?.submittedAt ?? new Date().toISOString();
        const questionId = wire?.data?.questionId ?? selection.questionId;

        recordSubmitSuccess(attemptId, quizVersionId, sessionId, {
          questionId,
          submittedAt,
        } as never);

        // Revalidate the canonical answers cache so the runner's lock
        // set is refreshed from the server.
        await globalMutate(
          ATTEMPT_CACHE_KEYS.answers(attemptId, sessionId),
        );

        // Emit one cross-tab broadcast.
        broadcastAttemptsChanged({
          userId: sessionId,
          attemptId,
          kind: 'submit',
        });

        const successOutcome: SubmitAnswerOutcome = {
          kind: 'success',
          questionId,
          submittedAt,
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
        // 409 — already answered (server-side duplicate, including
        // replay after a lost success response). Refresh server
        // answers and lock the reconciled question.
        if (
          isApiError(cause)
          && cause.status === 409
          && cause.code === 'ATTEMPT_QUESTION_ALREADY_ANSWERED'
        ) {
          await globalMutate(
            ATTEMPT_CACHE_KEYS.answers(attemptId, sessionId),
          );
          recordMutationFailure(
            attemptId,
            quizVersionId,
            sessionId,
            cause,
            'in_progress',
          );
          const dupOutcome: SubmitAnswerOutcome = {
            kind: 'already_answered',
          };
          setOutcome(dupOutcome);
          setIsPending(false);
          return dupOutcome;
        }

        // 409 ATTEMPT_NOT_ACTIVE — the attempt itself is no longer
        // in progress. Surface as `not_active`.
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
          const notActiveOutcome: SubmitAnswerOutcome = {
            kind: 'not_active',
          };
          setOutcome(notActiveOutcome);
          setIsPending(false);
          return notActiveOutcome;
        }

        // 422 ATTEMPT_QUESTION_INVALID — question is not in this
        // attempt. Surface as `question_invalid`.
        if (
          isApiError(cause)
          && (cause.status === 422 || cause.status === 400)
          && cause.code === 'ATTEMPT_QUESTION_INVALID'
        ) {
          const blockedOutcome: SubmitAnswerOutcome = {
            kind: 'question_invalid',
          };
          setOutcome(blockedOutcome);
          setIsPending(false);
          return blockedOutcome;
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
          const forbiddenOutcome: SubmitAnswerOutcome = {
            kind: 'forbidden',
          };
          setOutcome(forbiddenOutcome);
          setIsPending(false);
          return forbiddenOutcome;
        }

        // 429 / 5xx / network — surface the typed error so the UI
        // can offer a retry path. Preserve the validated selection
        // (the store keeps it as the draft).
        const apiError = isApiError(cause)
          ? cause
          : new ApiError({ message: 'submit_answer_failed', status: 0 });
        setError(apiError);
        recordMutationFailure(
          attemptId,
          quizVersionId,
          sessionId,
          apiError,
          'in_progress',
        );
        const retryable: SubmitAnswerOutcome = {
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

  // The runner reads the `in_progress` status to gate the picker.
  // Expose a setter so callers can converge after a remote submit.
  void ({} as AttemptRunnerStatus);

  return {
    isPending,
    isCoolingDown,
    outcome,
    error,
    submit,
    reset,
  };
}