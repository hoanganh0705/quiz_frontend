

import type { AttemptReviewResponseDtoStatus } from './attemptReviewResponseDtoStatus';
import type { AttemptReviewQuestionDto } from './attemptReviewQuestionDto';

export interface AttemptReviewResponseDto {

attemptId: string;

status: AttemptReviewResponseDtoStatus;

quizId: string;

quizTitle: string;

quizSlug: string;

versionNumber: number;

difficulty: string;

passingScorePercent: number;

scorePercent?: number | null;

correctCount?: number | null;

totalQuestions: number;

timeTakenMs?: number | null;

xpEarned: number;

finishedAt: string;

questions: AttemptReviewQuestionDto[];
}
