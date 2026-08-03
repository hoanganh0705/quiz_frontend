/**
 * `tournaments.service.ts` — Tournaments service (Phase 3).
 *
 * Source epic:   Story 3.x — Tournament browse + lifecycle.
 * Source ticket: TKT-4.1.G-prep.
 *
 * Replaces `features/tournaments/wrappers/tournament.wrapper.ts`.
 * One-for-one migration of the legacy surface.
 */

import { getTournaments } from '@/lib/api';

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

export type ListTournamentsParams = TournamentControllerListTournamentsParams;

// ─── Reads ──────────────────────────────────────────────────────────────

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

// ─── Writes ─────────────────────────────────────────────────────────────

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