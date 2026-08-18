

import type { CancelTournamentResponseDtoStatus } from './cancelTournamentResponseDtoStatus';

export interface CancelTournamentResponseDto {

tournamentId: string;

status: CancelTournamentResponseDtoStatus;

cancelledAt: string;
}
