

import type { CreateTournamentRoundDtoDescription } from './createTournamentRoundDtoDescription';
import type { CreateTournamentRoundDtoDurationMs } from './createTournamentRoundDtoDurationMs';
import type { CreateTournamentRoundDtoParticipantLimit } from './createTournamentRoundDtoParticipantLimit';

export interface CreateTournamentRoundDto {

name: string;

description?: CreateTournamentRoundDtoDescription;

quizVersionId: string;

startAt?: string | null;

endAt?: string | null;

durationMs?: CreateTournamentRoundDtoDurationMs;

isElimination?: boolean;

participantLimit?: CreateTournamentRoundDtoParticipantLimit;
}
