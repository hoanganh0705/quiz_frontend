"use client";

import { useEffect } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import {
  subscribeToAttemptEvents,
  type AttemptChangeKind,
  type AttemptsChangedEvent,
} from "@/lib/api/core/attempts-broadcast-channel";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { ATTEMPT_CACHE_KEYS } from "@/features/attempts/types/attempt-runner.types";
import { ATTEMPT_RESULT_CACHE_KEYS } from "@/features/attempts/types/attempt-result.types";
import {
  recordAbandonSuccess,
  recordCompletionSuccess,
  useAttemptsStore,
} from "@/features/attempts/stores/useAttemptsStore";

export interface UseAttemptCrossTabSyncParams {
  quizVersionId: string | null;
}

export function useAttemptCrossTabSync(
  params: UseAttemptCrossTabSyncParams,
): void {
  const { quizVersionId } = params;

  const { bootstrapState, currentUser } = useAuthSession();

  const sessionId =
    bootstrapState === "authenticated" && currentUser
      ? ((currentUser as { id?: string; userId?: string }).id ??
        (currentUser as { userId?: string }).userId ??
        null)
      : null;

  useEffect(() => {
    if (sessionId === null) return;

    const unsubscribe = subscribeToAttemptEvents((event) => {
      if (!isEventForSession(event, sessionId)) return;
      handleRemoteAttemptEvent(event, quizVersionId);
    });

    return () => {
      unsubscribe();
    };
  }, [sessionId, quizVersionId]);
}

function isEventForSession(
  event: AttemptsChangedEvent,
  sessionId: string,
): boolean {
  return event.userId === sessionId;
}

function handleRemoteAttemptEvent(
  event: AttemptsChangedEvent,
  quizVersionId: string | null,
): void {
  try {
    const qc = getQueryClient();
    void qc.invalidateQueries({ queryKey: ["attempts"] });
    if (quizVersionId !== null) {
      void qc.invalidateQueries({
        queryKey: ATTEMPT_CACHE_KEYS.active(quizVersionId, event.userId),
      });
    }
    void qc.invalidateQueries({
      queryKey: ATTEMPT_CACHE_KEYS.detail(event.attemptId, event.userId),
    });
    void qc.invalidateQueries({
      queryKey: ATTEMPT_CACHE_KEYS.answers(event.attemptId, event.userId),
    });
    void qc.invalidateQueries({
      queryKey: ATTEMPT_RESULT_CACHE_KEYS.result(event.attemptId, event.userId),
    });
    void qc.invalidateQueries({ queryKey: ["attempts", "history"] });
  } catch {}

  const kind: AttemptChangeKind = event.kind;

  switch (kind) {
    case "start":
    case "submit":
    case "withdraw":
      return;

    case "abandon": {
      const reverseIndex = useAttemptsStore.getState().attemptsByQuizVersionId;
      for (const [qvId, attemptId] of Object.entries(reverseIndex)) {
        if (attemptId === event.attemptId) {
          recordAbandonSuccess(event.attemptId, qvId, event.userId);
          return;
        }
      }
      return;
    }

    case "complete": {
      const reverseIndex = useAttemptsStore.getState().attemptsByQuizVersionId;
      for (const [qvId, attemptId] of Object.entries(reverseIndex)) {
        if (attemptId === event.attemptId) {
          recordCompletionSuccess(event.attemptId, qvId, event.userId, {
            scorePercent: null,
            correctCount: null,
            xpEarned: 0,
            finishedAt: "",
          });
          return;
        }
      }
      return;
    }
  }
}
