

import type { FeaturedBadgeResponseDto } from './featuredBadgeResponseDto';

export interface PublicAchievementProfileResponseDto {

userId: string;

totalBadges: number;

rareBadges: number;

highestRank: number | null;

featuredBadges: FeaturedBadgeResponseDto[];
}
