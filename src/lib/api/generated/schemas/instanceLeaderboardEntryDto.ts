

import type { InstanceLeaderboardEntryDtoStatus } from './instanceLeaderboardEntryDtoStatus';

export interface InstanceLeaderboardEntryDto {

rank: number;

instancePlayerId: string;

userId: string;

username: string;

displayName?: string | null;

avatarUrl?: string | null;

status: InstanceLeaderboardEntryDtoStatus;

scorePercent?: number | null;

correctCount?: number | null;

timeTakenMs?: number | null;
}
