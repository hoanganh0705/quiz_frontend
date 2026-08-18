

import type { UpdateTournamentDtoDescription } from './updateTournamentDtoDescription';
import type { UpdateTournamentDtoDifficulty } from './updateTournamentDtoDifficulty';
import type { UpdateTournamentDtoPrize } from './updateTournamentDtoPrize';

export interface UpdateTournamentDto {

title?: string;

description?: UpdateTournamentDtoDescription;

difficulty?: UpdateTournamentDtoDifficulty;

prize?: UpdateTournamentDtoPrize;

startAt?: string;

endAt?: string;

maxParticipants?: number | null;

categoryId?: string | null;
}
