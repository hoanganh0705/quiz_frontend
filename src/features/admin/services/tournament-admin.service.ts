

import { getTournaments } from '@/lib/api';
import type {
CreateTournamentDto,
TournamentResponseDto,
UpdateTournamentDto,
} from '@/lib/api/generated/schemas';

export type {
TournamentControllerCreateTournamentResult,
TournamentControllerUpdateTournamentResult,
TournamentControllerSoftDeleteTournamentResult,
} from '@/lib/api/generated/tournaments/tournaments';

export type TournamentDto = TournamentResponseDto;

export async function createTournament(
input: CreateTournamentDto,
): Promise<TournamentDto> {
const sdk = getTournaments();
const wrapped = await sdk.tournamentControllerCreateTournament(input);
return (wrapped.data.data as TournamentDto) ?? (wrapped.data as unknown as TournamentDto);
}

export async function updateTournament(
id: string,
input: UpdateTournamentDto,
): Promise<TournamentDto> {
const sdk = getTournaments();
const wrapped = await sdk.tournamentControllerUpdateTournament(id, input);
return (wrapped.data.data as TournamentDto) ?? (wrapped.data as unknown as TournamentDto);
}

export async function deleteTournament(id: string): Promise<void> {
const sdk = getTournaments();
await sdk.tournamentControllerSoftDeleteTournament(id);
}
