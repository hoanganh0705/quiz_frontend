/**
 * Tournaments wrapper — wraps API calls with the custom API client.
 * Uses the generated SDK from orval.
 */

import { getTournaments } from '@/lib/api/generated/tournaments/tournaments';
import type {
  CreateTournamentDto,
  TournamentControllerListTournamentsParams,
} from '@/lib/api/generated/schemas';

export type {
  TournamentControllerCreateTournamentResult,
  TournamentControllerListTournamentsResult,
  TournamentControllerGetTournamentByIdResult,
  TournamentControllerRegisterForTournamentResult,
  TournamentControllerUnregisterFromTournamentResult,
  TournamentControllerGetLeaderboardResult,
  TournamentControllerStartRoundAttemptResult,
} from '@/lib/api/generated/tournaments/tournaments';

export interface ListTournamentsParams extends TournamentControllerListTournamentsParams {}

export async function listTournaments(params?: ListTournamentsParams) {
  const sdk = getTournaments();
  return sdk.tournamentControllerListTournaments(params);
}

export async function getTournament(id: string) {
  const sdk = getTournaments();
  return sdk.tournamentControllerGetTournamentById(id);
}

export async function getTournamentLeaderboard(id: string) {
  const sdk = getTournaments();
  return sdk.tournamentControllerGetLeaderboard(id);
}

export async function registerForTournament(id: string) {
  const sdk = getTournaments();
  return sdk.tournamentControllerRegisterForTournament(id);
}

export async function unregisterFromTournament(id: string) {
  const sdk = getTournaments();
  return sdk.tournamentControllerUnregisterFromTournament(id);
}

export async function startRoundAttempt(id: string, roundId: string) {
  const sdk = getTournaments();
  return sdk.tournamentControllerStartRoundAttempt(id, roundId);
}

export async function createTournament(params: CreateTournamentDto) {
  const sdk = getTournaments();
  return sdk.tournamentControllerCreateTournament(params);
}
