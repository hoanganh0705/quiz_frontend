import { getQueryClient } from "@/providers/QueryProvider";

import { ATTEMPT_KEYS } from "@/features/attempts/query-keys";
import { QUIZ_KEYS } from "@/features/quizzes/query-keys";

import type { ReviewFilters } from "@/features/reviews/types/review.types";

export const REVIEW_KEYS = {
  all: ["reviews"] as const,
  byQuiz: (quizId: string) => ["reviews", "quiz", quizId] as const,
  list: (quizId: string, filters?: ReviewFilters) =>
    [
      "reviews",
      "quiz",
      quizId,
      [filters?.cursor ?? undefined, filters?.limit ?? undefined],
    ] as const,
  mine: (quizId: string, sessionId: string) =>
    ["reviews", "my", quizId, sessionId] as const,
} as const;

export function isReviewListPageForQuiz(
  key: readonly unknown[],
  quizId: string,
): boolean {
  if (!Array.isArray(key)) return false;
  return key[0] === "reviews" && key[1] === "quiz" && key[2] === quizId;
}

export interface InvalidateReviewCachesArgs {
  quizId: string;
  sessionId?: string | null;
}

export async function invalidateReviewCaches(
  first: unknown,
  second?: InvalidateReviewCachesArgs,
): Promise<void> {
  const args = (
    second !== undefined ? second : first
  ) as InvalidateReviewCachesArgs;
  const { quizId, sessionId } = args;

  try {
    const qc = getQueryClient();
    const tasks: Promise<unknown>[] = [
      qc.invalidateQueries({ queryKey: REVIEW_KEYS.byQuiz(quizId) }),
      qc.invalidateQueries({ queryKey: QUIZ_KEYS.detail(quizId) }),
      qc.invalidateQueries({ queryKey: QUIZ_KEYS.aggregate(quizId) }),
    ];

    if (sessionId) {
      tasks.push(
        qc.invalidateQueries({ queryKey: REVIEW_KEYS.mine(quizId, sessionId) }),
        qc.invalidateQueries({
          queryKey: ATTEMPT_KEYS.completedCheck(quizId, sessionId),
        }),
      );
    }

    await Promise.all(tasks);
  } catch {}
}
