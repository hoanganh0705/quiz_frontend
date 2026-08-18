

import type { AttemptResponseDtoContextType } from './attemptResponseDtoContextType';
import type { AttemptResponseDtoStatus } from './attemptResponseDtoStatus';
import type { AttemptAnswerResponseDto } from './attemptAnswerResponseDto';

export interface AttemptResponseDto {

attemptId: string;

userId: string;

quizId: string;

quizTitle: string;

quizSlug: string;

versionNumber: number;

difficulty: string;

durationMs: number;

passingScorePercent: number;

rewardXp: number;

contextType: AttemptResponseDtoContextType;

contextRefId?: string | null;

status: AttemptResponseDtoStatus;

scorePercent?: number | null;

correctCount?: number | null;

startedAt: string;

finishedAt?: string | null;

timeTakenMs?: number | null;

xpEarned: number;

answers: AttemptAnswerResponseDto[];
}
