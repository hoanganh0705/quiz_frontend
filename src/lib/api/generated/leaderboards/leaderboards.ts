

import type {
RankingAdminControllerGetStatus200,
RankingAdminControllerTriggerConsistencyCheck200,
RankingAdminControllerTriggerPeriodReset200,
RankingAdminControllerTriggerPeriodResetParams,
RankingAdminControllerTriggerRecalculation200,
RankingAdminControllerTriggerRecalculationParams,
RankingControllerGetGlobalLeaderboard200,
RankingControllerGetGlobalLeaderboardParams,
RankingControllerGetLeaderboardDistribution200,
RankingControllerGetLeaderboardDistributionParams,
RankingControllerGetMyPeakRanks200,
RankingControllerGetMyPercentile200,
RankingControllerGetMyPercentileParams,
RankingControllerGetMyRank200,
RankingControllerGetMyRankForPeriod200,
RankingControllerGetMyRankForPeriodParams,
RankingControllerGetMyRankMovement200,
RankingControllerGetMyRankMovementParams,
RankingControllerGetMyRankingHistory200,
RankingControllerGetMyRankingHistoryParams,
RankingControllerGetMyRankingMilestones200,
RankingControllerGetNearbyRanks200,
RankingControllerGetNearbyRanksParams,
RankingControllerGetRecentWinners200,
RankingControllerGetTopMovers200,
RankingControllerGetTopMoversParams,
RankingControllerGetUserRank200,
RankingControllerGetUserRankForPeriod200,
RankingControllerGetUserRankForPeriodParams,
RankingControllerGetUserRankingHistory200,
RankingControllerGetUserRankingHistoryParams
} from '.././schemas';

import { orvalCustomInstance } from '../../core/custom-instance';

export const getLeaderboards = () => {

const rankingControllerGetGlobalLeaderboard = (
params?: RankingControllerGetGlobalLeaderboardParams,
 ) => {
return orvalCustomInstance<RankingControllerGetGlobalLeaderboard200>(
{url: `/api/v1/leaderboard`, method: 'GET',
params
    },
      );
    }

const rankingControllerGetLeaderboardDistribution = (
params?: RankingControllerGetLeaderboardDistributionParams,
 ) => {
return orvalCustomInstance<RankingControllerGetLeaderboardDistribution200>(
{url: `/api/v1/leaderboard/distribution`, method: 'GET',
params
    },
      );
    }

const rankingControllerGetTopMovers = (
params?: RankingControllerGetTopMoversParams,
 ) => {
return orvalCustomInstance<RankingControllerGetTopMovers200>(
{url: `/api/v1/leaderboard/top-movers`, method: 'GET',
params
    },
      );
    }

const rankingControllerGetRecentWinners = (

 ) => {
return orvalCustomInstance<RankingControllerGetRecentWinners200>(
{url: `/api/v1/leaderboard/recent-winners`, method: 'GET'
    },
      );
    }

const rankingControllerGetMyRank = (

 ) => {
return orvalCustomInstance<RankingControllerGetMyRank200>(
{url: `/api/v1/leaderboard/me`, method: 'GET'
    },
      );
    }

const rankingControllerGetMyRankForPeriod = (
params?: RankingControllerGetMyRankForPeriodParams,
 ) => {
return orvalCustomInstance<RankingControllerGetMyRankForPeriod200>(
{url: `/api/v1/leaderboard/me/rank`, method: 'GET',
params
    },
      );
    }

const rankingControllerGetMyPercentile = (
params?: RankingControllerGetMyPercentileParams,
 ) => {
return orvalCustomInstance<RankingControllerGetMyPercentile200>(
{url: `/api/v1/leaderboard/me/percentile`, method: 'GET',
params
    },
      );
    }

const rankingControllerGetMyRankingMilestones = (

 ) => {
return orvalCustomInstance<RankingControllerGetMyRankingMilestones200>(
{url: `/api/v1/leaderboard/me/milestones`, method: 'GET'
    },
      );
    }

const rankingControllerGetNearbyRanks = (
params?: RankingControllerGetNearbyRanksParams,
 ) => {
return orvalCustomInstance<RankingControllerGetNearbyRanks200>(
{url: `/api/v1/leaderboard/me/nearby`, method: 'GET',
params
    },
      );
    }

const rankingControllerGetMyRankMovement = (
params?: RankingControllerGetMyRankMovementParams,
 ) => {
return orvalCustomInstance<RankingControllerGetMyRankMovement200>(
{url: `/api/v1/leaderboard/me/movement`, method: 'GET',
params
    },
      );
    }

const rankingControllerGetMyPeakRanks = (

 ) => {
return orvalCustomInstance<RankingControllerGetMyPeakRanks200>(
{url: `/api/v1/leaderboard/me/peak-ranks`, method: 'GET'
    },
      );
    }

const rankingControllerGetMyRankingHistory = (
params?: RankingControllerGetMyRankingHistoryParams,
 ) => {
return orvalCustomInstance<RankingControllerGetMyRankingHistory200>(
{url: `/api/v1/leaderboard/me/history`, method: 'GET',
params
    },
      );
    }

const rankingControllerGetUserRank = (
userId: string,
 ) => {
return orvalCustomInstance<RankingControllerGetUserRank200>(
{url: `/api/v1/leaderboard/${userId}`, method: 'GET'
    },
      );
    }

const rankingControllerGetUserRankingHistory = (
userId: string,
params?: RankingControllerGetUserRankingHistoryParams,
 ) => {
return orvalCustomInstance<RankingControllerGetUserRankingHistory200>(
{url: `/api/v1/leaderboard/${userId}/history`, method: 'GET',
params
    },
      );
    }

const rankingControllerGetUserRankForPeriod = (
userId: string,
params?: RankingControllerGetUserRankForPeriodParams,
 ) => {
return orvalCustomInstance<RankingControllerGetUserRankForPeriod200>(
{url: `/api/v1/leaderboard/${userId}/rank`, method: 'GET',
params
    },
      );
    }

const rankingAdminControllerGetStatus = (

 ) => {
return orvalCustomInstance<RankingAdminControllerGetStatus200>(
{url: `/api/v1/admin/ranking/status`, method: 'GET'
    },
      );
    }

const rankingAdminControllerTriggerRecalculation = (
params?: RankingAdminControllerTriggerRecalculationParams,
 ) => {
return orvalCustomInstance<RankingAdminControllerTriggerRecalculation200>(
{url: `/api/v1/admin/ranking/recalculate`, method: 'POST',
params
    },
      );
    }

const rankingAdminControllerTriggerPeriodReset = (
params?: RankingAdminControllerTriggerPeriodResetParams,
 ) => {
return orvalCustomInstance<RankingAdminControllerTriggerPeriodReset200>(
{url: `/api/v1/admin/ranking/reset`, method: 'POST',
params
    },
      );
    }

const rankingAdminControllerTriggerConsistencyCheck = (

 ) => {
return orvalCustomInstance<RankingAdminControllerTriggerConsistencyCheck200>(
{url: `/api/v1/admin/ranking/consistency-check`, method: 'POST'
    },
      );
    }
return {rankingControllerGetGlobalLeaderboard,rankingControllerGetLeaderboardDistribution,rankingControllerGetTopMovers,rankingControllerGetRecentWinners,rankingControllerGetMyRank,rankingControllerGetMyRankForPeriod,rankingControllerGetMyPercentile,rankingControllerGetMyRankingMilestones,rankingControllerGetNearbyRanks,rankingControllerGetMyRankMovement,rankingControllerGetMyPeakRanks,rankingControllerGetMyRankingHistory,rankingControllerGetUserRank,rankingControllerGetUserRankingHistory,rankingControllerGetUserRankForPeriod,rankingAdminControllerGetStatus,rankingAdminControllerTriggerRecalculation,rankingAdminControllerTriggerPeriodReset,rankingAdminControllerTriggerConsistencyCheck}};
export type RankingControllerGetGlobalLeaderboardResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getLeaderboards>['rankingControllerGetGlobalLeaderboard']>>>
export type RankingControllerGetLeaderboardDistributionResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getLeaderboards>['rankingControllerGetLeaderboardDistribution']>>>
export type RankingControllerGetTopMoversResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getLeaderboards>['rankingControllerGetTopMovers']>>>
export type RankingControllerGetRecentWinnersResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getLeaderboards>['rankingControllerGetRecentWinners']>>>
export type RankingControllerGetMyRankResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getLeaderboards>['rankingControllerGetMyRank']>>>
export type RankingControllerGetMyRankForPeriodResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getLeaderboards>['rankingControllerGetMyRankForPeriod']>>>
export type RankingControllerGetMyPercentileResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getLeaderboards>['rankingControllerGetMyPercentile']>>>
export type RankingControllerGetMyRankingMilestonesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getLeaderboards>['rankingControllerGetMyRankingMilestones']>>>
export type RankingControllerGetNearbyRanksResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getLeaderboards>['rankingControllerGetNearbyRanks']>>>
export type RankingControllerGetMyRankMovementResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getLeaderboards>['rankingControllerGetMyRankMovement']>>>
export type RankingControllerGetMyPeakRanksResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getLeaderboards>['rankingControllerGetMyPeakRanks']>>>
export type RankingControllerGetMyRankingHistoryResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getLeaderboards>['rankingControllerGetMyRankingHistory']>>>
export type RankingControllerGetUserRankResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getLeaderboards>['rankingControllerGetUserRank']>>>
export type RankingControllerGetUserRankingHistoryResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getLeaderboards>['rankingControllerGetUserRankingHistory']>>>
export type RankingControllerGetUserRankForPeriodResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getLeaderboards>['rankingControllerGetUserRankForPeriod']>>>
export type RankingAdminControllerGetStatusResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getLeaderboards>['rankingAdminControllerGetStatus']>>>
export type RankingAdminControllerTriggerRecalculationResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getLeaderboards>['rankingAdminControllerTriggerRecalculation']>>>
export type RankingAdminControllerTriggerPeriodResetResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getLeaderboards>['rankingAdminControllerTriggerPeriodReset']>>>
export type RankingAdminControllerTriggerConsistencyCheckResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getLeaderboards>['rankingAdminControllerTriggerConsistencyCheck']>>>
