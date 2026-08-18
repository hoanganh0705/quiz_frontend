

import type { TournamentLeaderboardEntryDto } from './tournamentLeaderboardEntryDto';
import type { TournamentControllerGetLeaderboard200AllOfMeta } from './tournamentControllerGetLeaderboard200AllOfMeta';

export type TournamentControllerGetLeaderboard200AllOf = {
data?: TournamentLeaderboardEntryDto[];
meta?: TournamentControllerGetLeaderboard200AllOfMeta;
};
