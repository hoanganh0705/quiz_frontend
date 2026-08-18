

import type { TournamentLeaderboardEntryDtoStatus } from './tournamentLeaderboardEntryDtoStatus';

export interface TournamentLeaderboardEntryDto {

rank: number;

participantId: string;

userId: string;

username: string;

displayName?: string | null;

avatarUrl?: string | null;

totalScore: number;

totalTimeMs: number;

rankFinal?: number | null;

status: TournamentLeaderboardEntryDtoStatus;
}
