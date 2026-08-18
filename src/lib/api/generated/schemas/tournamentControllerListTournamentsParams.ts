

import type { TournamentControllerListTournamentsStatus } from './tournamentControllerListTournamentsStatus';
import type { TournamentControllerListTournamentsDifficulty } from './tournamentControllerListTournamentsDifficulty';

export type TournamentControllerListTournamentsParams = {

cursor?: string | null;

limit?: number | null;

status?: TournamentControllerListTournamentsStatus;

difficulty?: TournamentControllerListTournamentsDifficulty;

categoryId?: string | null;

tagIds?: string[] | null;

creatorId?: string | null;
};
