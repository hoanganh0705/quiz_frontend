

import type {
CreateTournamentDto,
CreateTournamentRoundDto,
TournamentControllerCancelTournament200,
TournamentControllerCreateTournament201,
TournamentControllerCreateTournamentRound201,
TournamentControllerGetActiveTournaments200,
TournamentControllerGetActiveTournamentsParams,
TournamentControllerGetCompletedTournaments200,
TournamentControllerGetCompletedTournamentsParams,
TournamentControllerGetLeaderboard200,
TournamentControllerGetLeaderboardParams,
TournamentControllerGetMyTournamentStanding200,
TournamentControllerGetRelatedTournaments200,
TournamentControllerGetRelatedTournamentsParams,
TournamentControllerGetTournamentById200,
TournamentControllerGetTournamentParticipants200,
TournamentControllerGetTournamentParticipantsParams,
TournamentControllerGetTournamentStats200,
TournamentControllerGetTournamentWinners200,
TournamentControllerGetTournamentWinnersParams,
TournamentControllerGetUpcomingTournaments200,
TournamentControllerGetUpcomingTournamentsParams,
TournamentControllerListTournaments200,
TournamentControllerListTournamentsParams,
TournamentControllerRegisterForTournament201,
TournamentControllerSoftDeleteTournament200,
TournamentControllerStartRoundAttempt201,
TournamentControllerUnregisterFromTournament200,
TournamentControllerUpdateTournament200,
TournamentControllerWithdrawFromTournament200,
UpdateTournamentDto
} from '.././schemas';

import { orvalCustomInstance } from '../../core/custom-instance';

export const getTournaments = () => {

const tournamentControllerCreateTournament = (
createTournamentDto: CreateTournamentDto,
 ) => {
return orvalCustomInstance<TournamentControllerCreateTournament201>(
{url: `/api/v1/tournaments`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: createTournamentDto
    },
      );
    }

const tournamentControllerListTournaments = (
params?: TournamentControllerListTournamentsParams,
 ) => {
return orvalCustomInstance<TournamentControllerListTournaments200>(
{url: `/api/v1/tournaments`, method: 'GET',
params
    },
      );
    }

const tournamentControllerCreateTournamentRound = (
id: string,
createTournamentRoundDto: CreateTournamentRoundDto,
 ) => {
return orvalCustomInstance<TournamentControllerCreateTournamentRound201>(
{url: `/api/v1/tournaments/${id}/rounds`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: createTournamentRoundDto
    },
      );
    }

const tournamentControllerGetUpcomingTournaments = (
params?: TournamentControllerGetUpcomingTournamentsParams,
 ) => {
return orvalCustomInstance<TournamentControllerGetUpcomingTournaments200>(
{url: `/api/v1/tournaments/upcoming`, method: 'GET',
params
    },
      );
    }

const tournamentControllerGetActiveTournaments = (
params?: TournamentControllerGetActiveTournamentsParams,
 ) => {
return orvalCustomInstance<TournamentControllerGetActiveTournaments200>(
{url: `/api/v1/tournaments/active`, method: 'GET',
params
    },
      );
    }

const tournamentControllerGetCompletedTournaments = (
params?: TournamentControllerGetCompletedTournamentsParams,
 ) => {
return orvalCustomInstance<TournamentControllerGetCompletedTournaments200>(
{url: `/api/v1/tournaments/completed`, method: 'GET',
params
    },
      );
    }

const tournamentControllerGetRelatedTournaments = (
id: string,
params?: TournamentControllerGetRelatedTournamentsParams,
 ) => {
return orvalCustomInstance<TournamentControllerGetRelatedTournaments200>(
{url: `/api/v1/tournaments/${id}/related`, method: 'GET',
params
    },
      );
    }

const tournamentControllerGetTournamentStats = (
id: string,
 ) => {
return orvalCustomInstance<TournamentControllerGetTournamentStats200>(
{url: `/api/v1/tournaments/${id}/stats`, method: 'GET'
    },
      );
    }

const tournamentControllerGetTournamentWinners = (
id: string,
params?: TournamentControllerGetTournamentWinnersParams,
 ) => {
return orvalCustomInstance<TournamentControllerGetTournamentWinners200>(
{url: `/api/v1/tournaments/${id}/winners`, method: 'GET',
params
    },
      );
    }

const tournamentControllerGetTournamentById = (
id: string,
 ) => {
return orvalCustomInstance<TournamentControllerGetTournamentById200>(
{url: `/api/v1/tournaments/${id}`, method: 'GET'
    },
      );
    }

const tournamentControllerUpdateTournament = (
id: string,
updateTournamentDto: UpdateTournamentDto,
 ) => {
return orvalCustomInstance<TournamentControllerUpdateTournament200>(
{url: `/api/v1/tournaments/${id}`, method: 'PATCH',
headers: {'Content-Type': 'application/json', },
data: updateTournamentDto
    },
      );
    }

const tournamentControllerSoftDeleteTournament = (
id: string,
 ) => {
return orvalCustomInstance<TournamentControllerSoftDeleteTournament200>(
{url: `/api/v1/tournaments/${id}`, method: 'DELETE'
    },
      );
    }

const tournamentControllerGetTournamentParticipants = (
id: string,
params?: TournamentControllerGetTournamentParticipantsParams,
 ) => {
return orvalCustomInstance<TournamentControllerGetTournamentParticipants200>(
{url: `/api/v1/tournaments/${id}/participants`, method: 'GET',
params
    },
      );
    }

const tournamentControllerCancelTournament = (
id: string,
 ) => {
return orvalCustomInstance<TournamentControllerCancelTournament200>(
{url: `/api/v1/tournaments/${id}/cancel`, method: 'POST'
    },
      );
    }

const tournamentControllerRegisterForTournament = (
id: string,
 ) => {
return orvalCustomInstance<TournamentControllerRegisterForTournament201>(
{url: `/api/v1/tournaments/${id}/register`, method: 'POST'
    },
      );
    }

const tournamentControllerUnregisterFromTournament = (
id: string,
 ) => {
return orvalCustomInstance<TournamentControllerUnregisterFromTournament200>(
{url: `/api/v1/tournaments/${id}/register`, method: 'DELETE'
    },
      );
    }

const tournamentControllerGetLeaderboard = (
id: string,
params?: TournamentControllerGetLeaderboardParams,
 ) => {
return orvalCustomInstance<TournamentControllerGetLeaderboard200>(
{url: `/api/v1/tournaments/${id}/leaderboard`, method: 'GET',
params
    },
      );
    }

const tournamentControllerGetMyTournamentStanding = (
id: string,
 ) => {
return orvalCustomInstance<TournamentControllerGetMyTournamentStanding200>(
{url: `/api/v1/tournaments/${id}/my-standing`, method: 'GET'
    },
      );
    }

const tournamentControllerStartRoundAttempt = (
id: string,
roundId: string,
 ) => {
return orvalCustomInstance<TournamentControllerStartRoundAttempt201>(
{url: `/api/v1/tournaments/${id}/rounds/${roundId}/attempts`, method: 'POST'
    },
      );
    }

const tournamentControllerWithdrawFromTournament = (
id: string,
 ) => {
return orvalCustomInstance<TournamentControllerWithdrawFromTournament200>(
{url: `/api/v1/tournaments/${id}/withdraw`, method: 'POST'
    },
      );
    }
return {tournamentControllerCreateTournament,tournamentControllerListTournaments,tournamentControllerCreateTournamentRound,tournamentControllerGetUpcomingTournaments,tournamentControllerGetActiveTournaments,tournamentControllerGetCompletedTournaments,tournamentControllerGetRelatedTournaments,tournamentControllerGetTournamentStats,tournamentControllerGetTournamentWinners,tournamentControllerGetTournamentById,tournamentControllerUpdateTournament,tournamentControllerSoftDeleteTournament,tournamentControllerGetTournamentParticipants,tournamentControllerCancelTournament,tournamentControllerRegisterForTournament,tournamentControllerUnregisterFromTournament,tournamentControllerGetLeaderboard,tournamentControllerGetMyTournamentStanding,tournamentControllerStartRoundAttempt,tournamentControllerWithdrawFromTournament}};
export type TournamentControllerCreateTournamentResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTournaments>['tournamentControllerCreateTournament']>>>
export type TournamentControllerListTournamentsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTournaments>['tournamentControllerListTournaments']>>>
export type TournamentControllerCreateTournamentRoundResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTournaments>['tournamentControllerCreateTournamentRound']>>>
export type TournamentControllerGetUpcomingTournamentsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTournaments>['tournamentControllerGetUpcomingTournaments']>>>
export type TournamentControllerGetActiveTournamentsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTournaments>['tournamentControllerGetActiveTournaments']>>>
export type TournamentControllerGetCompletedTournamentsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTournaments>['tournamentControllerGetCompletedTournaments']>>>
export type TournamentControllerGetRelatedTournamentsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTournaments>['tournamentControllerGetRelatedTournaments']>>>
export type TournamentControllerGetTournamentStatsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTournaments>['tournamentControllerGetTournamentStats']>>>
export type TournamentControllerGetTournamentWinnersResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTournaments>['tournamentControllerGetTournamentWinners']>>>
export type TournamentControllerGetTournamentByIdResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTournaments>['tournamentControllerGetTournamentById']>>>
export type TournamentControllerUpdateTournamentResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTournaments>['tournamentControllerUpdateTournament']>>>
export type TournamentControllerSoftDeleteTournamentResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTournaments>['tournamentControllerSoftDeleteTournament']>>>
export type TournamentControllerGetTournamentParticipantsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTournaments>['tournamentControllerGetTournamentParticipants']>>>
export type TournamentControllerCancelTournamentResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTournaments>['tournamentControllerCancelTournament']>>>
export type TournamentControllerRegisterForTournamentResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTournaments>['tournamentControllerRegisterForTournament']>>>
export type TournamentControllerUnregisterFromTournamentResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTournaments>['tournamentControllerUnregisterFromTournament']>>>
export type TournamentControllerGetLeaderboardResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTournaments>['tournamentControllerGetLeaderboard']>>>
export type TournamentControllerGetMyTournamentStandingResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTournaments>['tournamentControllerGetMyTournamentStanding']>>>
export type TournamentControllerStartRoundAttemptResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTournaments>['tournamentControllerStartRoundAttempt']>>>
export type TournamentControllerWithdrawFromTournamentResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTournaments>['tournamentControllerWithdrawFromTournament']>>>
