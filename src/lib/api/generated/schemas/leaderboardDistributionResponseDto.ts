

import type { LeaderboardDistributionBucketDto } from './leaderboardDistributionBucketDto';

export interface LeaderboardDistributionResponseDto {

totalUsers: number;

remainingUsers: number;

buckets: LeaderboardDistributionBucketDto[];
}
