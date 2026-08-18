

import type { AttemptSummaryResponseDtoContextType } from './attemptSummaryResponseDtoContextType';
import type { AttemptSummaryResponseDtoStatus } from './attemptSummaryResponseDtoStatus';

export interface AttemptSummaryResponseDto {

attemptId: string;

quizId: string;

quizTitle: string;

quizSlug: string;

versionNumber: number;

difficulty: string;

contextType: AttemptSummaryResponseDtoContextType;

status: AttemptSummaryResponseDtoStatus;

scorePercent?: number | null;

correctCount?: number | null;

startedAt: string;

finishedAt?: string | null;

xpEarned: number;
}
