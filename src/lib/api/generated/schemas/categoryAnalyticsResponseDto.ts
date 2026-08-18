

import type { CategoryAnalyticsSummaryDto } from './categoryAnalyticsSummaryDto';
import type { CategoryAnalyticsTopQuizDto } from './categoryAnalyticsTopQuizDto';

export interface CategoryAnalyticsResponseDto {

categoryId: string;

categoryName: string;

summary: CategoryAnalyticsSummaryDto;

topQuizzes: CategoryAnalyticsTopQuizDto[];

lastUpdated: string;
}
