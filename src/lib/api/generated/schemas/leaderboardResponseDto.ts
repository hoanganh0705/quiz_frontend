

import type { LeaderboardEntryDto } from './leaderboardEntryDto';
import type { LeaderboardResponseDtoUserPosition } from './leaderboardResponseDtoUserPosition';
import type { PeriodInfoDto } from './periodInfoDto';
import type { PaginationDto } from './paginationDto';

export interface LeaderboardResponseDto {

entries: LeaderboardEntryDto[];

totalParticipants: number;

userPosition?: LeaderboardResponseDtoUserPosition;

period: PeriodInfoDto;

pagination: PaginationDto;
}
