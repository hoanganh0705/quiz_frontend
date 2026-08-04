/**
 * `tournaments.service.ts` — Tournaments service (Phase 3 + Phase 5).
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.F1.
 *
 * ## Phase 3 content
 *
 * Replaces `features/tournaments/wrappers/tournament.wrapper.ts`.
 * One-for-one migration of the legacy surface.
 *
 * ## Phase 5 additions
 *
 * Thin SDK pass-throughs with Sentry breadcrumbs and `data` envelope
 * unwrapping. All Phase 5 wrappers follow the same discipline as
 * `auth.service.ts` and `quizzes.service.ts`:
 *
 *   - Pure forwarders — no side-effects, no cache mutations.
 *   - `ApiError` is propagated unchanged so callers can read `apiError.code`.
 *   - One Sentry breadcrumb per call.
 *   - If the SDK response is missing `data` (malformed), throw a
 *     `GLOBAL_INTERNAL_ERROR` — never return undefined.
 *
 * ## SDK naming
 *
 * The backend's `TournamentController` causes orval to strip the
 * `Controller` suffix from operation names. Wrapper functions preserve
 * the planning-intent verbs.
 */

import * as Sentry from "@sentry/nextjs";

import { getTournaments } from "@/lib/api";

import { ApiError } from "@/lib/api/core/ApiError";

import type {
  CreateTournamentDto,
  UpdateTournamentDto,
  TournamentControllerListTournamentsParams,
  TournamentControllerGetUpcomingTournamentsParams,
  TournamentControllerGetActiveTournamentsParams,
  TournamentControllerGetCompletedTournamentsParams,
  TournamentControllerGetRelatedTournamentsParams,
  TournamentControllerGetLeaderboardParams,
  TournamentControllerGetTournamentParticipantsParams,
  CreateTournamentRoundDto,
} from "@/lib/api/generated/schemas";

import type {
  TournamentControllerGetUpcomingTournaments200,
  TournamentControllerGetActiveTournaments200,
  TournamentControllerGetCompletedTournaments200,
  TournamentControllerGetRelatedTournaments200,
  TournamentControllerGetTournamentParticipants200,
  TournamentControllerGetLeaderboard200,
  TournamentControllerGetTournamentStats200,
  TournamentControllerGetTournamentWinners200,
  TournamentControllerGetMyTournamentStanding200,
  TournamentControllerCreateTournament201,
  TournamentControllerCancelTournament200,
  TournamentControllerUpdateTournament200,
  TournamentControllerSoftDeleteTournament200,
  TournamentControllerStartRoundAttempt201,
  TournamentControllerWithdrawFromTournament200,
  TournamentControllerCreateTournamentRound201,
} from "@/lib/api/generated/tournaments/tournaments";

// ─── Type exports ────────────────────────────────────────────────────────────────

export type { ListTournamentsParams } from "@/lib/api/generated/schemas";

// ─── Phase 3 wrappers ────────────────────────────────────────────────────────

export async function listTournaments(
  params?: TournamentControllerListTournamentsParams,
) {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: "tournaments.listTournaments",
  });
  return getTournaments().tournamentControllerListTournaments(params);
}

export async function getTournament(id: string) {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `tournaments.getTournament(${id})`,
  });
  return getTournaments().tournamentControllerGetTournamentById(id);
}

export async function getTournamentLeaderboard(
  id: string,
  params?: TournamentControllerGetLeaderboardParams,
) {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `tournaments.getTournamentLeaderboard(${id})`,
  });
  return getTournaments().tournamentControllerGetLeaderboard(id, params);
}

export async function registerForTournament(id: string) {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `tournaments.registerForTournament(${id})`,
  });
  return getTournaments().tournamentControllerRegisterForTournament(id);
}

export async function unregisterFromTournament(id: string) {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `tournaments.unregisterFromTournament(${id})`,
  });
  return getTournaments().tournamentControllerUnregisterFromTournament(id);
}

export async function startRoundAttempt(tournamentId: string, roundId: string) {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `tournaments.startRoundAttempt(${tournamentId}, ${roundId})`,
  });
  return getTournaments().tournamentControllerStartRoundAttempt(
    tournamentId,
    roundId,
  );
}

export async function createTournament(params: CreateTournamentDto) {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: "tournaments.createTournament",
  });
  return getTournaments().tournamentControllerCreateTournament(params);
}

// ─── Phase 5 wrappers ────────────────────────────────────────────────────────

/**
 * `GET /api/v1/tournaments/upcoming`
 *
 * Returns an offset-paginated list of tournaments in `upcoming` status,
 * ordered by startAt ascending (or by registration deadline if specified).
 */
export async function getUpcomingTournaments(
  params?: TournamentControllerGetUpcomingTournamentsParams,
): Promise<TournamentControllerGetUpcomingTournaments200["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: "tournaments.getUpcomingTournaments",
  });
  const data =
    await getTournaments().tournamentControllerGetUpcomingTournaments(params);
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Upcoming tournaments response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return data.data;
}

/**
 * `GET /api/v1/tournaments/active`
 *
 * Returns an offset-paginated list of tournaments currently active
 * (`registration` or `ongoing` status and within their time window).
 */
export async function getActiveTournaments(
  params?: TournamentControllerGetActiveTournamentsParams,
): Promise<TournamentControllerGetActiveTournaments200["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: "tournaments.getActiveTournaments",
  });
  const data =
    await getTournaments().tournamentControllerGetActiveTournaments(params);
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Active tournaments response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return data.data;
}

/**
 * `GET /api/v1/tournaments/completed`
 *
 * Returns an offset-paginated list of tournaments in `finished` status
 * (endAt < now).
 */
export async function getCompletedTournaments(
  params?: TournamentControllerGetCompletedTournamentsParams,
): Promise<TournamentControllerGetCompletedTournaments200["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: "tournaments.getCompletedTournaments",
  });
  const data =
    await getTournaments().tournamentControllerGetCompletedTournaments(params);
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Completed tournaments response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return data.data;
}

/**
 * `GET /api/v1/tournaments/related`
 *
 * Returns tournaments related to a specific quiz or category.
 */
export async function getRelatedTournaments(
  params: TournamentControllerGetRelatedTournamentsParams,
): Promise<TournamentControllerGetRelatedTournaments200["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: "tournaments.getRelatedTournaments",
  });
  const data =
    await getTournaments().tournamentControllerGetRelatedTournaments(params);
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Related tournaments response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return data.data;
}

/**
 * `GET /api/v1/tournaments/:id/participants`
 *
 * Returns an offset-paginated list of participants for a tournament.
 */
export async function getTournamentParticipants(
  id: string,
  params?: TournamentControllerGetTournamentParticipantsParams,
): Promise<TournamentControllerGetTournamentParticipants200["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `tournaments.getTournamentParticipants(${id})`,
  });
  const data =
    await getTournaments().tournamentControllerGetTournamentParticipants(
      id,
      params,
    );
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Tournament participants response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return data.data;
}

/**
 * `GET /api/v1/tournaments/:id/stats`
 *
 * Returns aggregated stats for a tournament (participant count, submission count, etc.).
 */
export async function getTournamentStats(
  id: string,
): Promise<TournamentControllerGetTournamentStats200["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `tournaments.getTournamentStats(${id})`,
  });
  const data = await getTournaments().tournamentControllerGetTournamentStats(id);
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Tournament stats response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return data.data;
}

/**
 * `GET /api/v1/tournaments/:id/winners`
 *
 * Returns the winners of a finished tournament.
 */
export async function getTournamentWinners(
  id: string,
): Promise<TournamentControllerGetTournamentWinners200["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `tournaments.getTournamentWinners(${id})`,
  });
  const data =
    await getTournaments().tournamentControllerGetTournamentWinners(id);
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Tournament winners response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return data.data;
}

/**
 * `GET /api/v1/tournaments/:id/standing`
 *
 * Returns the current user's standing within a tournament.
 */
export async function getMyTournamentStanding(
  id: string,
): Promise<TournamentControllerGetMyTournamentStanding200["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `tournaments.getMyTournamentStanding(${id})`,
  });
  const data =
    await getTournaments().tournamentControllerGetMyTournamentStanding(id);
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Tournament standing response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return data.data;
}

/**
 * `POST /api/v1/tournaments/:id/rounds`
 *
 * Creates a new round for the given tournament. Requires `TOURNAMENT_CREATE`
 * permission. Rounds can only be added to tournaments in `upcoming` or
 * `registration` status.
 */
export async function createTournamentRound(
  id: string,
  params: CreateTournamentRoundDto,
): Promise<TournamentControllerCreateTournamentRound201["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `tournaments.createTournamentRound(${id})`,
  });
  const data =
    await getTournaments().tournamentControllerCreateTournamentRound(id, params);
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Create tournament round response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return data.data;
}

/**
 * `POST /api/v1/tournaments/:id/withdraw`
 *
 * Withdraws the current user from a tournament (after registration,
 * before the tournament starts).
 */
export async function withdrawFromTournament(
  id: string,
): Promise<TournamentControllerWithdrawFromTournament200["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `tournaments.withdrawFromTournament(${id})`,
  });
  const data =
    await getTournaments().tournamentControllerWithdrawFromTournament(id);
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Withdraw from tournament response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return data.data;
}

/**
 * `PUT /api/v1/tournaments/:id`
 *
 * Updates tournament metadata. Requires `TOURNAMENT_CREATE` permission.
 */
export async function updateTournament(
  id: string,
  params: UpdateTournamentDto,
): Promise<TournamentControllerUpdateTournament200["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `tournaments.updateTournament(${id})`,
  });
  const data =
    await getTournaments().tournamentControllerUpdateTournament(id, params);
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Update tournament response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return data.data;
}

/**
 * `DELETE /api/v1/tournaments/:id`
 *
 * Soft-deletes a tournament. Requires `TOURNAMENT_CREATE` permission.
 */
export async function deleteTournament(
  id: string,
): Promise<TournamentControllerSoftDeleteTournament200["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `tournaments.deleteTournament(${id})`,
  });
  const data =
    await getTournaments().tournamentControllerSoftDeleteTournament(id);
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Delete tournament response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return data.data;
}

/**
 * `POST /api/v1/tournaments/:id/cancel`
 *
 * Cancels a tournament. Requires `TOURNAMENT_CREATE` permission.
 */
export async function cancelTournament(
  id: string,
): Promise<TournamentControllerCancelTournament200["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `tournaments.cancelTournament(${id})`,
  });
  const data =
    await getTournaments().tournamentControllerCancelTournament(id);
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Cancel tournament response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return data.data;
}
