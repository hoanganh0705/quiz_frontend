/**
 * `features/admin/services/tournament-admin.service.ts` — Tournament admin service.
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.E7.
 *
 * Thin service layer that wraps the tournament admin SDK functions.
 * The service is the only layer under `features/admin/**` that touches
 * the SDK for tournament admin.
 *
 * ## Functions
 *
 *   - `createTournament(input)` — wraps `tournamentControllerCreateTournament`.
 *   - `updateTournament(id, input)` — wraps `tournamentControllerUpdateTournament`.
 *   - `deleteTournament(id)`     — wraps `tournamentControllerSoftDeleteTournament`.
 *                                  Irreversible; documents
 *                                  `TOURNAMENT_HAS_PARTICIPANTS` and
 *                                  `TOURNAMENT_ALREADY_STARTED`.
 *
 * ## Error contract
 *
 *   - `TOURNAMENT_ALREADY_STARTED` and `TOURNAMENT_HAS_PARTICIPANTS`
 *     codes are surfaced to the caller.
 *   - The service does NOT retry on these codes.
 */

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

/** The canonical tournament DTO returned by every read/write function. */
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

/**
 * Soft-delete a tournament.
 *
 * @throws `ApiError<ErrorCode>` with `code: TOURNAMENT_ALREADY_STARTED`
 *         when the tournament has already started (cannot unmount
 *         ongoing rounds).
 * @throws `ApiError<ErrorCode>` with `code: TOURNAMENT_HAS_PARTICIPANTS`
 *         when participants have registered. The admin must remove
 *         participants (or cancel the tournament) before retrying.
 */
export async function deleteTournament(id: string): Promise<void> {
  const sdk = getTournaments();
  await sdk.tournamentControllerSoftDeleteTournament(id);
}
