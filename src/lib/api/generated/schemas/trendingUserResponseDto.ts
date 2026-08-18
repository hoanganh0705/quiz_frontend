

import type { TrendingUserResponseDtoAvatarUrl } from './trendingUserResponseDtoAvatarUrl';
import type { TrendingUserResponseDtoTrendReason } from './trendingUserResponseDtoTrendReason';

export interface TrendingUserResponseDto {

userId: string;

username: string;

avatarUrl?: TrendingUserResponseDtoAvatarUrl;

followers: number;

trendScore: number;

trendReason: TrendingUserResponseDtoTrendReason;
}
