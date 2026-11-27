"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, isApiError } from "@/lib/api";

import { ATTEMPT_KEYS } from "@/features/attempts/query-keys";
import { completeAttempt as completeAttemptService } from "@/features/attempts/services/attempts.service";
import {
  hydrateAttemptEntry,
  recordCompletionSuccess,
} from "@/features/attempts/stores/useAttemptsStore";
import { useAuthSessionId } from "@/features/auth/hooks/use-auth-session-id";
import { useUserStore } from "@/features/users/store/user-store";
import {
  myAnalyticsKey,
  myRankingKey,
} from "@/features/users/types/user-analytics.types";
import { broadcastAttemptsChanged } from "@/lib/api/core/attempts-broadcast-channel";

import type { CompleteAttemptResponseDto } from "@/lib/api/generated/schemas";

export interface UseCompleteAttemptParams {
  attemptId: string | null;

  quizVersionId: string | null;

  quizId?: string | null;
}

export type CompleteAttemptOutcome =
  | { kind: "idle" }
  | { kind: "completing" }
  | { kind: "success"; result: CompleteAttemptResponseDto }
  | { kind: "not_active" }
  | { kind: "redirect"; target: "/quizzes"; error: ApiError }
  | { kind: "validation"; error: ApiError }
  | { kind: "retryable"; error: ApiError }
  | { kind: "cooldown" };

export interface UseCompleteAttemptResult {
  isPending: boolean;

  isCoolingDown: boolean;

  outcome: CompleteAttemptOutcome | null;

  error: ApiError | null;

  complete: () => Promise<CompleteAttemptOutcome>;

  reset: () => void;
}

const DEFAULT_COOLDOWN_MS = 500;

function revalidateAttemptCaches(
  attemptId: string,
  quizVersionId: string,
  sessionId: string,
  quizId?: string | null,
): Promise<unknown>[] {
  const qc = getQueryClient();
  const tasks: Promise<unknown>[] = [
    qc.invalidateQueries({
      queryKey: ATTEMPT_KEYS.active(quizVersionId, sessionId),
    }),
    qc.invalidateQueries({
      queryKey: ATTEMPT_KEYS.detail(attemptId, sessionId),
    }),
    qc.invalidateQueries({
      queryKey: ATTEMPT_KEYS.answers(attemptId, sessionId),
    }),
    qc.invalidateQueries({
      queryKey: ATTEMPT_KEYS.result(attemptId, sessionId),
    }),
    qc.invalidateQueries({ queryKey: ATTEMPT_KEYS.history(sessionId) }),
    qc.invalidateQueries({
      queryKey: ["attempts", "history", "stats", sessionId],
    }),
    qc.invalidateQueries({ queryKey: ATTEMPT_KEYS.all }),
    qc.invalidateQueries({ queryKey: myRankingKey() }),
    qc.invalidateQueries({ queryKey: myAnalyticsKey() }),
    qc.invalidateQueries({ queryKey: ["rankings"] }),
    qc.invalidateQueries({ queryKey: ["leaderboards"] }),
  ];

  if (quizId) {
    tasks.push(
      qc.invalidateQueries({
        queryKey: ATTEMPT_KEYS.active(quizId, sessionId),
      }),
      qc.invalidateQueries({
        queryKey: ATTEMPT_KEYS.completedCheck(quizId, sessionId),
      }),
    );
  }

  return tasks;
}

export function useCompleteAttempt(
  params: UseCompleteAttemptParams,
): UseCompleteAttemptResult {
  const { attemptId, quizVersionId, quizId } = params;

  const sessionId = useAuthSessionId();

  const [outcome, setOutcome] = useState<CompleteAttemptOutcome | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isPending, setIsPending] = useState<boolean>(false);
  const [isCoolingDown, setIsCoolingDown] = useState<boolean>(false);

  const lastInvocationRef = useRef<number>(0);
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
  }, []);

  const complete = useCallback(async (): Promise<CompleteAttemptOutcome> => {
    if (sessionId === null || attemptId === null || quizVersionId === null) {
      return { kind: "idle" };
    }

    const now = Date.now();
    if (now - lastInvocationRef.current < DEFAULT_COOLDOWN_MS) {
      const dropped: CompleteAttemptOutcome = { kind: "cooldown" };
      setOutcome(dropped);
      return dropped;
    }
    lastInvocationRef.current = now;

    setIsPending(true);
    setError(null);
    setOutcome({ kind: "completing" });

    try {
      const result = await completeAttemptService(attemptId);

      hydrateAttemptEntry(attemptId, quizVersionId, sessionId, {
        error: null,
        cooldownUntil: null,
      });

      recordCompletionSuccess(attemptId, quizVersionId, sessionId, {
        ...(result as unknown as import("@/features/attempts/stores/useAttemptsStore").CompletedAttemptSnapshot),
        correctCount: result.correctCount ?? null,
        xpEarned: result.xpEarned ?? 0,
        finishedAt: result.finishedAt ?? new Date().toISOString(),
      });

      await Promise.all(
        revalidateAttemptCaches(attemptId, quizVersionId, sessionId, quizId),
      ).catch(() => {
        // Best-effort: swallow so the broadcast still fires.
      });

      void useUserStore.getState().fetchCurrentUser();

      broadcastAttemptsChanged({
        userId: sessionId,
        attemptId,
        kind: "complete",
      });

      const successOutcome: CompleteAttemptOutcome = {
        kind: "success",
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
      if (
        isApiError(cause) &&
        cause.code === "ATTEMPT_NOT_ACTIVE" &&
        (cause.status === 403 || cause.status === 409)
      ) {
        hydrateAttemptEntry(attemptId, quizVersionId, sessionId, {
          status: "completed",
          error: null,
          cooldownUntil: null,
        });
        await Promise.all(
          revalidateAttemptCaches(attemptId, quizVersionId, sessionId, quizId),
        );
        const swapped: CompleteAttemptOutcome = { kind: "not_active" };
        setOutcome(swapped);
        setIsPending(false);
        return swapped;
      }

      if (
        isApiError(cause) &&
        (cause.code === "ATTEMPT_NOT_FOUND" ||
          cause.code === "ATTEMPT_FORBIDDEN")
      ) {
        setError(cause);
        const redirect: CompleteAttemptOutcome = {
          kind: "redirect",
          target: "/quizzes",
          error: cause,
        };
        setOutcome(redirect);
        setIsPending(false);
        return redirect;
      }

      if (isApiError(cause) && cause.code === "ATTEMPT_VALIDATION_FAILED") {
        setError(cause);
        const validation: CompleteAttemptOutcome = {
          kind: "validation",
          error: cause,
        };
        setOutcome(validation);
        setIsPending(false);
        return validation;
      }

      const apiError = isApiError(cause)
        ? cause
        : new ApiError({ message: "complete_attempt_failed", status: 0 });
      setError(apiError);
      const retryable: CompleteAttemptOutcome = {
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
  }, [sessionId, attemptId, quizVersionId, quizId]);

  return {
    isPending,
    isCoolingDown,
    outcome,
    error,
    complete,
    reset,
  };
}
