

import type { TournamentDetailResponseDtoDifficulty } from './tournamentDetailResponseDtoDifficulty';
import type { TournamentDetailResponseDtoStatus } from './tournamentDetailResponseDtoStatus';
import type { TournamentRoundResponseDto } from './tournamentRoundResponseDto';

export interface TournamentDetailResponseDto {

tournamentId: string;

title: string;

description?: string | null;

difficulty: TournamentDetailResponseDtoDifficulty;

status: TournamentDetailResponseDtoStatus;

prize?: string | null;

startAt: string;

endAt: string;

maxParticipants?: number | null;

categoryId?: string | null;

ownerUserId: string;

createdAt: string;

updatedAt: string;

categoryName?: string | null;

categorySlug?: string | null;

totalParticipants: number;

rounds: TournamentRoundResponseDto[];
}
