

import type { ReviewDashboardResponseDtoFavoriteCategory } from './reviewDashboardResponseDtoFavoriteCategory';
import type { ReviewDashboardResponseDtoFavoriteTag } from './reviewDashboardResponseDtoFavoriteTag';
import type { ReviewDashboardResponseDtoLastUpdated } from './reviewDashboardResponseDtoLastUpdated';

export interface ReviewDashboardResponseDto {

totalReviews: number;

averageRatingGiven: number;

favoriteCategory?: ReviewDashboardResponseDtoFavoriteCategory;

favoriteTag?: ReviewDashboardResponseDtoFavoriteTag;

lastUpdated?: ReviewDashboardResponseDtoLastUpdated;
}
