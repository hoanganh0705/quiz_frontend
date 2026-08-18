

import type { WithdrawTournamentResponseDtoStatus } from './withdrawTournamentResponseDtoStatus';

export interface WithdrawTournamentResponseDto {

success: boolean;

tournamentId: string;

status: WithdrawTournamentResponseDtoStatus;

withdrawnAt: string;
}
