import {
  serializeAttemptHistoryFilters,
  type AttemptHistoryFilters,
} from "@/features/attempts/types/attempt-history.types";

export const ATTEMPT_KEYS = {
  all: ["attempts"] as const,
  active: (quizId: string, sessionId: string) =>
    ["attempts", "active", sessionId, quizId] as const,
  detail: (attemptId: string, sessionId: string) =>
    ["attempts", "detail", sessionId, attemptId] as const,
  answers: (attemptId: string, sessionId: string) =>
    ["attempts", "answers", sessionId, attemptId] as const,
  result: (attemptId: string, sessionId: string) =>
    ["attempts", "result", sessionId, attemptId] as const,
  historyAll: () => ["attempts", "history"] as const,
  history: (sessionId: string) => ["attempts", "history", sessionId] as const,
  historyList: (sessionId: string, filters: AttemptHistoryFilters) =>
    [
      "attempts",
      "history",
      sessionId,
      serializeAttemptHistoryFilters(filters),
    ] as const,
  completedCheck: (quizId: string, sessionId: string) =>
    ["attempts", "completed-check", sessionId, quizId] as const,
} as const;
