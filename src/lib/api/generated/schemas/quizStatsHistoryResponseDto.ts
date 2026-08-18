

import type { QuizStatsHistoryResponseDtoRange } from './quizStatsHistoryResponseDtoRange';
import type { QuizStatsHistoryResponseDtoBucket } from './quizStatsHistoryResponseDtoBucket';
import type { QuizStatsHistoryPointDto } from './quizStatsHistoryPointDto';

export interface QuizStatsHistoryResponseDto {

quizId: string;

range: QuizStatsHistoryResponseDtoRange;

bucket: QuizStatsHistoryResponseDtoBucket;

points: QuizStatsHistoryPointDto[];
}
