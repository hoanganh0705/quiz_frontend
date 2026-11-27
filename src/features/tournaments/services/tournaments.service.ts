import * as Sentry from "@sentry/nextjs";

import { getTournaments, unwrapEnvelope } from "@/lib/api";

import type {
  CreateTournamentDto,
  CreateTournamentRoundDto,
  TournamentControllerGetActiveTournamentsParams,
  TournamentControllerGetCompletedTournamentsParams,
  TournamentControllerGetLeaderboardParams,
  TournamentControllerGetRelatedTournamentsParams,
  TournamentControllerGetTournamentParticipantsParams,
  TournamentControllerGetUpcomingTournamentsParams,
  TournamentControllerListTournamentsParams,
  UpdateTournamentDto,
} from "@/lib/api/generated/schemas";

export type { TournamentControllerListTournamentsParams as ListTournamentsParams } from "@/lib/api/generated/schemas";

export async function listTournaments(
  params?: TournamentControllerListTournamentsParams,
) {
  Sentry.addBreadcrumb({
    category: "tournaments:service",
    message: "tournaments.listTournaments",
  });
  return getTournaments().tournamentControllerListTournaments(params);
}

export async function getTournament(id: string) {
  Sentry.addBreadcrumb({
    category: "tournaments:service",
    message: `tournaments.getTournament(${id})`,
  });
  return getTournaments().tournamentControllerGetTournamentById(id);
}

export async function getTournamentLeaderboard(
  id: string,
  params?: TournamentControllerGetLeaderboardParams,
) {
  Sentry.addBreadcrumb({
    category: "tournaments:service",
    message: `tournaments.getTournamentLeaderboard(${id})`,
  });
  return getTournaments().tournamentControllerGetLeaderboard(id, params);
}

export async function registerForTournament(id: string) {
  Sentry.addBreadcrumb({
    category: "tournaments:service",
    message: `tournaments.registerForTournament(${id})`,
  });
  return getTournaments().tournamentControllerRegisterForTournament(id);
}

export async function unregisterFromTournament(id: string) {
  Sentry.addBreadcrumb({
    category: "tournaments:service",
    message: `tournaments.unregisterFromTournament(${id})`,
  });
  return getTournaments().tournamentControllerUnregisterFromTournament(id);
}

export async function startRoundAttempt(tournamentId: string, roundId: string) {
  Sentry.addBreadcrumb({
    category: "tournaments:service",
    message: `tournaments.startRoundAttempt(${tournamentId}, ${roundId})`,
  });
  return getTournaments().tournamentControllerStartRoundAttempt(
    tournamentId,
    roundId,
  );
}

export async function createTournament(params: CreateTournamentDto) {
  Sentry.addBreadcrumb({
    category: "tournaments:service",
    message: "tournaments.createTournament",
  });
  return getTournaments().tournamentControllerCreateTournament(params);
}

export async function getUpcomingTournaments(
  params?: TournamentControllerGetUpcomingTournamentsParams,
) {
  Sentry.addBreadcrumb({
    category: "tournaments:service",
    message: "tournaments.getUpcomingTournaments",
  });
  const response =
    await getTournaments().tournamentControllerGetUpcomingTournaments(params);
  return unwrapEnvelope(
    response,
    "Upcoming tournaments response missing data envelope",
  );
}

export async function getActiveTournaments(
  params?: TournamentControllerGetActiveTournamentsParams,
) {
  Sentry.addBreadcrumb({
    category: "tournaments:service",
    message: "tournaments.getActiveTournaments",
  });
  const response =
    await getTournaments().tournamentControllerGetActiveTournaments(params);
  return unwrapEnvelope(
    response,
    "Active tournaments response missing data envelope",
  );
}

export async function getCompletedTournaments(
  params?: TournamentControllerGetCompletedTournamentsParams,
) {
  Sentry.addBreadcrumb({
    category: "tournaments:service",
    message: "tournaments.getCompletedTournaments",
  });
  const response =
    await getTournaments().tournamentControllerGetCompletedTournaments(params);
  return unwrapEnvelope(
    response,
    "Completed tournaments response missing data envelope",
  );
}

export async function getRelatedTournaments(
  id: string,
  params?: TournamentControllerGetRelatedTournamentsParams,
) {
  Sentry.addBreadcrumb({
    category: "tournaments:service",
    message: `tournaments.getRelatedTournaments(${id})`,
  });
  const response =
    await getTournaments().tournamentControllerGetRelatedTournaments(
      id,
      params,
    );
  return unwrapEnvelope(
    response,
    "Related tournaments response missing data envelope",
  );
}

export async function getTournamentParticipants(
  id: string,
  params?: TournamentControllerGetTournamentParticipantsParams,
) {
  Sentry.addBreadcrumb({
    category: "tournaments:service",
    message: `tournaments.getTournamentParticipants(${id})`,
  });
  const response =
    await getTournaments().tournamentControllerGetTournamentParticipants(
      id,
      params,
    );
  return unwrapEnvelope(
    response,
    "Tournament participants response missing data envelope",
  );
}

export async function getTournamentStats(id: string) {
  Sentry.addBreadcrumb({
    category: "tournaments:service",
    message: `tournaments.getTournamentStats(${id})`,
  });
  const response =
    await getTournaments().tournamentControllerGetTournamentStats(id);
  return unwrapEnvelope(
    response,
    "Tournament stats response missing data envelope",
  );
}

export async function getTournamentWinners(id: string) {
  Sentry.addBreadcrumb({
    category: "tournaments:service",
    message: `tournaments.getTournamentWinners(${id})`,
  });
  const response =
    await getTournaments().tournamentControllerGetTournamentWinners(id);
  return unwrapEnvelope(
    response,
    "Tournament winners response missing data envelope",
  );
}

export async function getMyTournamentStanding(id: string) {
  Sentry.addBreadcrumb({
    category: "tournaments:service",
    message: `tournaments.getMyTournamentStanding(${id})`,
  });
  const response =
    await getTournaments().tournamentControllerGetMyTournamentStanding(id);
  return unwrapEnvelope(
    response,
    "Tournament standing response missing data envelope",
  );
}

export async function createTournamentRound(
  id: string,
  params: CreateTournamentRoundDto,
) {
  Sentry.addBreadcrumb({
    category: "tournaments:service",
    message: `tournaments.createTournamentRound(${id})`,
  });
  const response =
    await getTournaments().tournamentControllerCreateTournamentRound(
      id,
      params,
    );
  return unwrapEnvelope(
    response,
    "Create tournament round response missing data envelope",
  );
}

export async function withdrawFromTournament(id: string) {
  Sentry.addBreadcrumb({
    category: "tournaments:service",
    message: `tournaments.withdrawFromTournament(${id})`,
  });
  const response =
    await getTournaments().tournamentControllerWithdrawFromTournament(id);
  return unwrapEnvelope(
    response,
    "Withdraw from tournament response missing data envelope",
  );
}

export async function updateTournament(
  id: string,
  params: UpdateTournamentDto,
) {
  Sentry.addBreadcrumb({
    category: "tournaments:service",
    message: `tournaments.updateTournament(${id})`,
  });
  const response =
    await getTournaments().tournamentControllerUpdateTournament(id, params);
  return unwrapEnvelope(
    response,
    "Update tournament response missing data envelope",
  );
}

export async function deleteTournament(id: string) {
  Sentry.addBreadcrumb({
    category: "tournaments:service",
    message: `tournaments.deleteTournament(${id})`,
  });
  const response =
    await getTournaments().tournamentControllerSoftDeleteTournament(id);
  return unwrapEnvelope(
    response,
    "Delete tournament response missing data envelope",
  );
}

export async function cancelTournament(id: string) {
  Sentry.addBreadcrumb({
    category: "tournaments:service",
    message: `tournaments.cancelTournament(${id})`,
  });
  const response =
    await getTournaments().tournamentControllerCancelTournament(id);
  return unwrapEnvelope(
    response,
    "Cancel tournament response missing data envelope",
  );
}
