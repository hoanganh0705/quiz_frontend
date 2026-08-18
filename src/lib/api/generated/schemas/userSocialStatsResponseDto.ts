

import type { UserSocialStatsResponseDtoStaleAt } from './userSocialStatsResponseDtoStaleAt';

export interface UserSocialStatsResponseDto {

friends: number;

followers: number;

following: number;

staleAt?: UserSocialStatsResponseDtoStaleAt;

isStale: boolean;
}
