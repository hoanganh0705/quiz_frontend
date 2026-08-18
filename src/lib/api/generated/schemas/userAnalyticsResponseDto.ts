

import type { UserAnalyticsSummaryDto } from './userAnalyticsSummaryDto';
import type { UserAnalyticsResponseDtoFavoriteCategory } from './userAnalyticsResponseDtoFavoriteCategory';
import type { UserAnalyticsResponseDtoFavoriteTag } from './userAnalyticsResponseDtoFavoriteTag';

export interface UserAnalyticsResponseDto {

userId: string;

summary: UserAnalyticsSummaryDto;

favoriteCategory?: UserAnalyticsResponseDtoFavoriteCategory;

favoriteTag?: UserAnalyticsResponseDtoFavoriteTag;

lastUpdated: string;
}
