

import type { TagAnalyticsSummaryDto } from './tagAnalyticsSummaryDto';
import type { TagAnalyticsTopQuizDto } from './tagAnalyticsTopQuizDto';

export interface TagAnalyticsResponseDto {

tagId: string;

tagName: string;

summary: TagAnalyticsSummaryDto;

topQuizzes: TagAnalyticsTopQuizDto[];

lastUpdated: string;
}
