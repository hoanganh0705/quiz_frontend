

import type {
AttemptReviewResponseDto,
AttemptReviewQuestionDto,
} from '@/lib/api/generated/schemas';

export type AttemptResultDto = AttemptReviewResponseDto;

export type AttemptQuestionScoreDto = AttemptReviewQuestionDto;

export interface AttemptScoreSummaryDto {

attemptId: string;

quizId: string;

quizTitle: string;

quizSlug: string;

totalQuestions: number;

correctCount: number | null;

scorePercent: number | null;

xpEarned: number;

finishedAt: string;
}

export function scoreSummaryFromResult(
result: AttemptResultDto,
): AttemptScoreSummaryDto {
return {
attemptId: result.attemptId,
quizId: result.quizId,
quizTitle: result.quizTitle,
quizSlug: result.quizSlug,
totalQuestions: result.totalQuestions,
correctCount: result.correctCount ?? null,
scorePercent: result.scorePercent ?? null,
xpEarned: result.xpEarned,
finishedAt: result.finishedAt,
  };
}

export const ATTEMPT_RESULT_CACHE_KEYS = {

result(attemptId: string, sessionId: string) {
return ['attempts', 'result', sessionId, attemptId] as const;
  },
} as const;