

import type { FriendLeaderboardDtoPeriod } from './friendLeaderboardDtoPeriod';
import type { FriendRankingEntryDto } from './friendRankingEntryDto';
import type { FriendLeaderboardDtoCurrentUserRank } from './friendLeaderboardDtoCurrentUserRank';
import type { FriendLeaderboardDtoStaleAt } from './friendLeaderboardDtoStaleAt';

export interface FriendLeaderboardDto {

period: FriendLeaderboardDtoPeriod;

entries: FriendRankingEntryDto[];

currentUserRank?: FriendLeaderboardDtoCurrentUserRank;

totalParticipants: number;

staleAt?: FriendLeaderboardDtoStaleAt;

isStale: boolean;
}
