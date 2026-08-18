

import type { GlobalRankingDto } from './globalRankingDto';
import type { PeakRanksResponseDto } from './peakRanksResponseDto';
import type { UserRankResponseDtoLastActivityAt } from './userRankResponseDtoLastActivityAt';
import type { UserBadgesDto } from './userBadgesDto';

export interface UserRankResponseDto {

global: GlobalRankingDto;

peakRanks: PeakRanksResponseDto;

lastActivityAt?: UserRankResponseDtoLastActivityAt;

badges: UserBadgesDto;
}
