

import type { UserAttemptStatsResponseDtoFavoriteCategory } from './userAttemptStatsResponseDtoFavoriteCategory';
import type { UserAttemptStatsResponseDtoFavoriteTag } from './userAttemptStatsResponseDtoFavoriteTag';

export interface UserAttemptStatsResponseDto {

totalAttempts: number;

completedAttempts: number;

abandonedAttempts: number;

averageScore: number;

totalTimeSpentSeconds: number;

favoriteCategory?: UserAttemptStatsResponseDtoFavoriteCategory;

favoriteTag?: UserAttemptStatsResponseDtoFavoriteTag;

lastAttemptAt?: string | null;
}
