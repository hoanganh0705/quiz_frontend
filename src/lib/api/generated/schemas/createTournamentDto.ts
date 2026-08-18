

import type { CreateTournamentDtoDescription } from './createTournamentDtoDescription';
import type { CreateTournamentDtoDifficulty } from './createTournamentDtoDifficulty';
import type { CreateTournamentDtoPrize } from './createTournamentDtoPrize';

export interface CreateTournamentDto {

title: string;

description?: CreateTournamentDtoDescription;

difficulty: CreateTournamentDtoDifficulty;

prize?: CreateTournamentDtoPrize;

startAt: string;

endAt: string;

maxParticipants?: number | null;

categoryId?: string | null;
}
