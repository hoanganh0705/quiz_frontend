

import type { CompleteAttemptResponseDtoStatus } from './completeAttemptResponseDtoStatus';

export interface CompleteAttemptResponseDto {

attemptId: string;

quizId: string;

status: CompleteAttemptResponseDtoStatus;

scorePercent?: number | null;

correctCount?: number | null;

timeTakenMs?: number | null;

xpEarned: number;

finishedAt: string;
}
