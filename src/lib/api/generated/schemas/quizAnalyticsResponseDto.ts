

import type { QuizMetricsDto } from './quizMetricsDto';
import type { ReviewMetricsDto } from './reviewMetricsDto';
import type { EngagementMetricsDto } from './engagementMetricsDto';
import type { PopularityDto } from './popularityDto';

export interface QuizAnalyticsResponseDto {

quizId: string;

metrics: QuizMetricsDto;

reviewMetrics: ReviewMetricsDto;

engagementMetrics: EngagementMetricsDto;

popularity: PopularityDto;

lastUpdated: string;
}
