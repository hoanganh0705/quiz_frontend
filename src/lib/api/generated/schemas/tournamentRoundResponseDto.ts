

import type { TournamentRoundResponseDtoStatus } from './tournamentRoundResponseDtoStatus';

export interface TournamentRoundResponseDto {

roundId: string;

tournamentId: string;

roundNumber: number;

name: string;

description?: string | null;

quizVersionId: string;

startAt?: string | null;

endAt?: string | null;

durationMs?: number | null;

status: TournamentRoundResponseDtoStatus;

isElimination: boolean;

participantLimit?: number | null;

createdAt: string;

updatedAt: string;
}
