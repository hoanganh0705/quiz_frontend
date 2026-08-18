

import type { ReviewRatingDistributionDto } from './reviewRatingDistributionDto';

export interface ReviewStatsResponseDto {

averageRating: number;

totalReviews: number;

ratingDistribution: ReviewRatingDistributionDto;
}
