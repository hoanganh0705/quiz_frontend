

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

export type { TournamentControllerListTournamentsParams as ListTournamentsParams } from "@/lib/api/generated/schemas";

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

export async function getUpcomingTournaments(
params?: TournamentControllerGetUpcomingTournamentsParams,
): Promise<unknown> {
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

export async function getActiveTournaments(
params?: TournamentControllerGetActiveTournamentsParams,
): Promise<unknown> {
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

export async function getCompletedTournaments(
params?: TournamentControllerGetCompletedTournamentsParams,
): Promise<unknown> {
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

export async function getRelatedTournaments(
id: string,
params?: TournamentControllerGetRelatedTournamentsParams,
): Promise<unknown> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: `tournaments.getRelatedTournaments(${id})`,
  });
const data = await getTournaments().tournamentControllerGetRelatedTournaments(
id,
params,
  );
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Related tournaments response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function getTournamentParticipants(
id: string,
params?: TournamentControllerGetTournamentParticipantsParams,
): Promise<unknown> {
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

export async function getTournamentStats(id: string): Promise<unknown> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: `tournaments.getTournamentStats(${id})`,
  });
const data =
await getTournaments().tournamentControllerGetTournamentStats(id);
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Tournament stats response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function getTournamentWinners(id: string): Promise<unknown> {
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

export async function getMyTournamentStanding(id: string): Promise<unknown> {
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

export async function createTournamentRound(
id: string,
params: CreateTournamentRoundDto,
): Promise<unknown> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: `tournaments.createTournamentRound(${id})`,
  });
const data = await getTournaments().tournamentControllerCreateTournamentRound(
id,
params,
  );
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Create tournament round response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function withdrawFromTournament(id: string): Promise<unknown> {
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

export async function updateTournament(
id: string,
params: UpdateTournamentDto,
): Promise<unknown> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: `tournaments.updateTournament(${id})`,
  });
const data = await getTournaments().tournamentControllerUpdateTournament(
id,
params,
  );
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Update tournament response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function deleteTournament(id: string): Promise<unknown> {
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

export async function cancelTournament(id: string): Promise<unknown> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: `tournaments.cancelTournament(${id})`,
  });
const data = await getTournaments().tournamentControllerCancelTournament(id);
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Cancel tournament response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}
