

export interface AttemptAnalyticsResponseDto {

attemptId: string;

score?: number | null;

accuracy?: number | null;

correctAnswers?: number | null;

incorrectAnswers?: number | null;

unansweredQuestions: number;

timeSpentSeconds?: number | null;

percentileRank: number;

completedAt?: string | null;
}
