"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, isApiError } from "@/lib/api";

import { ATTEMPT_KEYS } from "@/features/attempts/query-keys";
import { withdrawAnswer } from "@/features/attempts/services/attempts.service";
import { useAuthSessionId } from "@/features/auth/hooks/use-auth-session-id";
import {
  recordMutationFailure,
  recordWithdrawSuccess,
} from "@/features/attempts/stores/useAttemptsStore";
import { broadcastAttemptsChanged } from "@/lib/api/core/attempts-broadcast-channel";

export interface UseDeleteAnswerParams {
  attemptId: string | null;

  quizVersionId: string | null;
}

export type DeleteAnswerOutcome =
  | { kind: "idle" }
  | { kind: "withdrawing" }
  | { kind: "success"; questionId: string }
  | { kind: "already_missing"; questionId: string }
  | { kind: "not_found" }
  | { kind: "not_active" }
  | { kind: "forbidden" }
  | { kind: "retryable"; error: ApiError }
  | { kind: "cooldown" };

export interface UseDeleteAnswerResult {
  isPending: boolean;

  isCoolingDown: boolean;

  outcome: DeleteAnswerOutcome | null;

  error: ApiError | null;

  withdraw: (questionId: string) => Promise<DeleteAnswerOutcome>;

  reset: () => void;
}

const DEFAULT_COOLDOWN_MS = 500;

export function useDeleteAnswer(
  params: UseDeleteAnswerParams,
): UseDeleteAnswerResult {
  const { attemptId, quizVersionId } = params;

  const sessionId = useAuthSessionId();

  const [outcome, setOutcome] = useState<DeleteAnswerOutcome | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isPending, setIsPending] = useState<boolean>(false);
  const [isCoolingDown, setIsCoolingDown] = useState<boolean>(false);

  const lastInvocationByQuestionRef = useRef<Record<string, number>>({});
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current !== null) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  const reset = useCallback(() => {
    setOutcome(null);
    setError(null);
    setIsPending(false);
    setIsCoolingDown(false);
    lastInvocationByQuestionRef.current = {};
  }, []);

  const withdraw = useCallback(
    async (questionId: string): Promise<DeleteAnswerOutcome> => {
      if (
        sessionId === null ||
        attemptId === null ||
        quizVersionId === null ||
        !questionId
      ) {
        return { kind: "idle" };
      }

      const now = Date.now();
      const lastTime = lastInvocationByQuestionRef.current[questionId] ?? 0;
      if (now - lastTime < DEFAULT_COOLDOWN_MS) {
        const dropped: DeleteAnswerOutcome = { kind: "cooldown" };
        setOutcome(dropped);
        return dropped;
      }
      lastInvocationByQuestionRef.current[questionId] = now;

      setIsPending(true);
      setError(null);
      setOutcome({ kind: "withdrawing" });

      try {
        await withdrawAnswer(attemptId, questionId);

        recordWithdrawSuccess(attemptId, quizVersionId, sessionId, questionId);

        try {
          const qc = getQueryClient();
          void qc.invalidateQueries({
            queryKey: ATTEMPT_KEYS.answers(attemptId, sessionId),
          });
          void qc.invalidateQueries({ queryKey: ATTEMPT_KEYS.all });
        } catch {}

        broadcastAttemptsChanged({
          userId: sessionId,
          attemptId,
          kind: "withdraw",
        });

        const successOutcome: DeleteAnswerOutcome = {
          kind: "success",
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
        if (
          isApiError(cause) &&
          cause.status === 404 &&
          cause.code === "ATTEMPT_ANSWER_NOT_FOUND"
        ) {
          recordWithdrawSuccess(
            attemptId,
            quizVersionId,
            sessionId,
            questionId,
          );
          try {
            const qc = getQueryClient();
            void qc.invalidateQueries({
              queryKey: ATTEMPT_KEYS.answers(attemptId, sessionId),
            });
          } catch {}
          const silent: DeleteAnswerOutcome = {
            kind: "already_missing",
            questionId,
          };
          setOutcome(silent);
          setIsPending(false);
          return silent;
        }

        if (
          isApiError(cause) &&
          cause.status === 404 &&
          cause.code === "ATTEMPT_NOT_FOUND"
        ) {
          recordMutationFailure(
            attemptId,
            quizVersionId,
            sessionId,
            cause,
            "idle",
          );
          const notFound: DeleteAnswerOutcome = { kind: "not_found" };
          setOutcome(notFound);
          setIsPending(false);
          return notFound;
        }

        if (
          isApiError(cause) &&
          cause.status === 409 &&
          cause.code === "ATTEMPT_NOT_ACTIVE"
        ) {
          recordMutationFailure(
            attemptId,
            quizVersionId,
            sessionId,
            cause,
            "in_progress",
          );
          const notActive: DeleteAnswerOutcome = { kind: "not_active" };
          setOutcome(notActive);
          setIsPending(false);
          return notActive;
        }

        if (isApiError(cause) && cause.status === 403) {
          recordMutationFailure(
            attemptId,
            quizVersionId,
            sessionId,
            cause,
            "in_progress",
          );
          const forbidden: DeleteAnswerOutcome = { kind: "forbidden" };
          setOutcome(forbidden);
          setIsPending(false);
          return forbidden;
        }

        const apiError = isApiError(cause)
          ? cause
          : new ApiError({ message: "withdraw_answer_failed", status: 0 });
        setError(apiError);
        recordMutationFailure(
          attemptId,
          quizVersionId,
          sessionId,
          apiError,
          "in_progress",
        );
        const retryable: DeleteAnswerOutcome = {
          kind: "retryable",
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
