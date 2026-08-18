

import type { UserSummaryResponseDto } from './userSummaryResponseDto';
import type { UserAnalyticsResponseDto } from './userAnalyticsResponseDto';
import type { TimeSeriesDto } from './timeSeriesDto';
import type { UserActivityItemDto } from './userActivityItemDto';

export interface UserProfileBundleResponseDto {

summary: UserSummaryResponseDto;

analytics: UserAnalyticsResponseDto;

xpHistory: TimeSeriesDto;

recentActivity: UserActivityItemDto[];
}
