"use client";

import { useEffect } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import {
  subscribeToAttemptEvents,
  type AttemptChangeKind,
  type AttemptsChangedEvent,
} from "@/lib/api/core/attempts-broadcast-channel";

import { ATTEMPT_KEYS } from "@/features/attempts/query-keys";
import {
  recordAbandonSuccess,
  recordCompletionSuccess,
  useAttemptsStore,
} from "@/features/attempts/stores/useAttemptsStore";
import { useAuthSessionId } from "@/features/auth/hooks/use-auth-session-id";

export interface UseAttemptCrossTabSyncParams {
  quizVersionId: string | null;

  quizId?: string | null;
}

export function useAttemptCrossTabSync(
  params: UseAttemptCrossTabSyncParams,
): void {
  const { quizVersionId, quizId } = params;

  const sessionId = useAuthSessionId();

  useEffect(() => {
    if (sessionId === null) return;

    const unsubscribe = subscribeToAttemptEvents((event) => {
      if (!isEventForSession(event, sessionId)) return;
      handleRemoteAttemptEvent(event, quizVersionId, quizId ?? null);
    });

    return () => {
      unsubscribe();
    };
  }, [sessionId, quizVersionId, quizId]);
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
  quizId: string | null,
): void {
  try {
    const qc = getQueryClient();
    void qc.invalidateQueries({ queryKey: ATTEMPT_KEYS.all });
    if (quizId !== null) {
      void qc.invalidateQueries({
        queryKey: ATTEMPT_KEYS.active(quizId, event.userId),
      });
    }
    if (quizVersionId !== null) {
      void qc.invalidateQueries({
        queryKey: ATTEMPT_KEYS.active(quizVersionId, event.userId),
      });
    }
    void qc.invalidateQueries({
      queryKey: ATTEMPT_KEYS.detail(event.attemptId, event.userId),
    });
    void qc.invalidateQueries({
      queryKey: ATTEMPT_KEYS.answers(event.attemptId, event.userId),
    });
    void qc.invalidateQueries({
      queryKey: ATTEMPT_KEYS.result(event.attemptId, event.userId),
    });
    void qc.invalidateQueries({ queryKey: ATTEMPT_KEYS.historyAll() });
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
