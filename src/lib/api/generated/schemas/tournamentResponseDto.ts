

import type { TournamentResponseDtoDifficulty } from './tournamentResponseDtoDifficulty';
import type { TournamentResponseDtoStatus } from './tournamentResponseDtoStatus';

export interface TournamentResponseDto {

tournamentId: string;

title: string;

description?: string | null;

difficulty: TournamentResponseDtoDifficulty;

status: TournamentResponseDtoStatus;

prize?: string | null;

startAt: string;

endAt: string;

maxParticipants?: number | null;

categoryId?: string | null;

ownerUserId: string;

createdAt: string;

updatedAt: string;
}
