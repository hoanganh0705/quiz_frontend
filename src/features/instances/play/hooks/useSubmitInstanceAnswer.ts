"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { isApiError } from "@/lib/api";

import {
  startAttempt,
  submitAnswer,
  withdrawAnswer,
} from "@/features/attempts/services/attempts.service";

import {
  selectAttemptId,
  selectGameplaySubmission,
  selectGameplayTiming,
  selectSelectedOptionForQuestion,
  useInstanceGameplayStore,
} from "../stores/instanceGameplay.store";
import { useInstanceGameSocket } from "./useInstanceGameSocket";
import { useQuestionTimer } from "./useQuestionTimer";

import type {
  AnswerSubmissionDto,
  AnswerSubmissionState,
} from "../types/gameplay.types";
import type { ApiError } from "@/lib/api";

export interface UseSubmitInstanceAnswerResult {
  submit: (optionId: string) => Promise<void>;
  state: AnswerSubmissionState;
  lastError: ApiError | null;
  submission: {
    questionId: string;
    submittedAt: string;
    accepted: boolean;
  } | null;
  selectedOptionId: string | null;
  canSubmit: boolean;
  reset: () => void;
}

const TRANSIENT_WS_ERROR_CODES = new Set([
  "DISCONNECT",
  "TIMEOUT",
  "AUTH_REQUIRED",
  "ATTEMPT_NOT_READY",
]);

export function useSubmitInstanceAnswer(
  instanceId: string | null,
  currentQuestionId: string | null,
): UseSubmitInstanceAnswerResult {
  const { emitAnswer } = useInstanceGameSocket(instanceId);

  const timing = useInstanceGameplayStore((s) =>
    instanceId ? selectGameplayTiming(s, instanceId) : null,
  );
  const storedOptionId = useInstanceGameplayStore((s) =>
    instanceId
      ? selectSelectedOptionForQuestion(s, instanceId, currentQuestionId)
      : null,
  );
  const storedSubmission = useInstanceGameplayStore((s) =>
    instanceId ? selectGameplaySubmission(s, instanceId) : null,
  );
  const attemptId = useInstanceGameplayStore((s) =>
    instanceId ? selectAttemptId(s, instanceId) : null,
  );

  const { isWindowOpen } = useQuestionTimer(instanceId);
  const windowOpen = timing ? isWindowOpen : true;

  const [errorEntry, setErrorEntry] = useState<{
    questionId: string;
    error: ApiError;
  } | null>(null);
  const questionEnteredAtRef = useRef<number | null>(null);

  useEffect(() => {
    questionEnteredAtRef.current = Date.now();
  }, [currentQuestionId]);

  const lastError =
    currentQuestionId !== null && errorEntry?.questionId === currentQuestionId
      ? errorEntry.error
      : null;

  const submission =
    currentQuestionId !== null &&
    storedSubmission?.questionId === currentQuestionId
      ? {
          questionId: storedSubmission.questionId,
          submittedAt: storedSubmission.submittedAt,
          accepted: storedSubmission.accepted,
        }
      : null;

  const canSubmit = currentQuestionId !== null && windowOpen;
  const state: AnswerSubmissionState =
    lastError !== null
      ? "rejected"
      : storedOptionId !== null
        ? "accepted"
        : "idle";

  const submit = useCallback(
    async (optionId: string): Promise<void> => {
      if (instanceId === null || currentQuestionId === null) return;
      if (!windowOpen) return;

      const nowMs = Date.now();
      const submittedAt = new Date(nowMs).toISOString();
      const enteredAtMs = questionEnteredAtRef.current ?? nowMs;
      const elapsedMs = Math.min(600_000, Math.max(100, nowMs - enteredAtMs));
      setErrorEntry(null);

      // Optimistically record selection immediately so clicking feels instant
      // like a normal quiz without blocking on network/WebSocket roundtrips.
      useInstanceGameplayStore
        .getState()
        .selectQuestionAnswer(instanceId, currentQuestionId, optionId);

      // Persist answer against the real attempt so the backend scores it accurately.
      void (async () => {
        try {
          const store = useInstanceGameplayStore.getState();
          let activeAttemptId =
            store.entries[instanceId]?.attemptId ?? attemptId;

          if (!activeAttemptId) {
            const quizId = store.entries[instanceId]?.quizId ?? null;
            if (quizId) {
              const started = (await startAttempt(quizId, {
                contextType: "solo",
                contextRefId: instanceId,
              })) as unknown as {
                attemptId?: string;
                data?: { attemptId?: string };
              };
              const createdId =
                started?.attemptId ?? started?.data?.attemptId ?? null;
              if (createdId) {
                activeAttemptId = createdId;
                useInstanceGameplayStore
                  .getState()
                  .setAttemptId(instanceId, createdId);
              }
            }
          }

          if (!activeAttemptId) return;

          try {
            await submitAnswer(activeAttemptId, {
              questionId: currentQuestionId,
              selectedOptionId: optionId,
              timeTakenMs: elapsedMs,
            });
          } catch (submitErr: unknown) {
            // If the user changed their answer on an already-answered question,
            // withdraw the previous answer first and submit the new selection.
            if (
              isApiError(submitErr) &&
              submitErr.status === 409 &&
              submitErr.code === "ATTEMPT_QUESTION_ALREADY_ANSWERED"
            ) {
              await withdrawAnswer(activeAttemptId, currentQuestionId);
              await submitAnswer(activeAttemptId, {
                questionId: currentQuestionId,
                selectedOptionId: optionId,
                timeTakenMs: elapsedMs,
              });
            }
          }
        } catch {
          // Final flush before completeAttempt guarantees no answers are lost
        }
      })();

      const payload: AnswerSubmissionDto = {
        questionId: currentQuestionId,
        optionId,
        submittedAt,
        timeTakenMs: elapsedMs,
        clientToken: crypto.randomUUID(),
      };

      try {
        await emitAnswer(payload);
      } catch (cause: unknown) {
        if (
          isApiError(cause) &&
          !TRANSIENT_WS_ERROR_CODES.has(String(cause.code))
        ) {
          setErrorEntry({
            questionId: currentQuestionId,
            error: cause as ApiError,
          });
        }
      }
    },
    [instanceId, currentQuestionId, windowOpen, attemptId, emitAnswer],
  );

  const reset = useCallback((): void => {
    setErrorEntry(null);
  }, []);

  return {
    submit,
    state,
    lastError,
    submission,
    selectedOptionId: storedOptionId,
    canSubmit,
    reset,
  };
}
