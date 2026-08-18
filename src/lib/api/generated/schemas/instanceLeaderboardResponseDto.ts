

import type { InstanceLeaderboardEntryDto } from './instanceLeaderboardEntryDto';
import type { InstanceLeaderboardPaginationDto } from './instanceLeaderboardPaginationDto';

export interface InstanceLeaderboardResponseDto {

items: InstanceLeaderboardEntryDto[];

pagination: InstanceLeaderboardPaginationDto;
}
