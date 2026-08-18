

import * as Sentry from "@sentry/nextjs";

import { getLeaderboards } from "@/lib/api";

import { ApiError } from "@/lib/api/core/ApiError";

import type {
RankingControllerGetGlobalLeaderboardParams,
RankingControllerGetLeaderboardDistributionParams,
RankingControllerGetTopMoversParams,
RankingControllerGetMyRankForPeriodParams,
RankingControllerGetMyPercentileParams,
RankingControllerGetNearbyRanksParams,
RankingControllerGetMyRankMovementParams,
RankingControllerGetUserRankForPeriodParams,
RankingControllerGetUserRankingHistoryParams,
} from "@/lib/api/generated/schemas";

import type {
RankingControllerGetGlobalLeaderboardResult,
RankingControllerGetLeaderboardDistributionResult,
RankingControllerGetTopMoversResult,
RankingControllerGetMyRankResult,
RankingControllerGetMyRankForPeriodResult,
RankingControllerGetMyPercentileResult,
RankingControllerGetMyRankingMilestonesResult,
RankingControllerGetNearbyRanksResult,
RankingControllerGetMyRankMovementResult,
RankingControllerGetMyPeakRanksResult,
RankingControllerGetMyRankingHistoryResult,
RankingControllerGetUserRankResult,
RankingControllerGetUserRankingHistoryResult,
RankingControllerGetUserRankForPeriodResult,
} from "@/lib/api/generated/leaderboards/leaderboards";

export async function getMyRanking(): Promise<RankingControllerGetMyRankResult["data"]> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: "rankings.getMyRanking",
  });
const data = await getLeaderboards().rankingControllerGetMyRank();
return data.data ?? null;
}

export async function getMyRankForPeriod(
params: RankingControllerGetMyRankForPeriodParams,
): Promise<RankingControllerGetMyRankForPeriodResult["data"]> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: "rankings.getMyRankForPeriod",
  });
const data = await getLeaderboards().rankingControllerGetMyRankForPeriod(params);
return data.data ?? null;
}

export async function getMyPercentile(
params?: RankingControllerGetMyPercentileParams,
): Promise<RankingControllerGetMyPercentileResult["data"]> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: "rankings.getMyPercentile",
  });
const data = await getLeaderboards().rankingControllerGetMyPercentile(params);
return data.data ?? null;
}

export async function getMyRankingMilestones(): Promise<
RankingControllerGetMyRankingMilestonesResult["data"]
> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: "rankings.getMyRankingMilestones",
  });
const data = await getLeaderboards().rankingControllerGetMyRankingMilestones();
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Ranking milestones response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function getMyRankingHistory(): Promise<
RankingControllerGetMyRankingHistoryResult["data"]
> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: "rankings.getMyRankingHistory",
  });
const data = await getLeaderboards().rankingControllerGetMyRankingHistory();
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Ranking history response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function getMyPeakRanks(): Promise<
RankingControllerGetMyPeakRanksResult["data"]
> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: "rankings.getMyPeakRanks",
  });
const data = await getLeaderboards().rankingControllerGetMyPeakRanks();
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Peak ranks response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function getNearbyRanks(
params?: RankingControllerGetNearbyRanksParams,
): Promise<RankingControllerGetNearbyRanksResult["data"]> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: "rankings.getNearbyRanks",
  });
const data = await getLeaderboards().rankingControllerGetNearbyRanks(params);
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Nearby ranks response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function getMyRankMovement(
params?: RankingControllerGetMyRankMovementParams,
): Promise<RankingControllerGetMyRankMovementResult["data"]> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: "rankings.getMyRankMovement",
  });
const data = await getLeaderboards().rankingControllerGetMyRankMovement(params);
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Rank movement response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function getRankingLeaderboard(
params?: RankingControllerGetGlobalLeaderboardParams,
): Promise<RankingControllerGetGlobalLeaderboardResult["data"]> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: "rankings.getRankingLeaderboard",
  });
const data = await getLeaderboards().rankingControllerGetGlobalLeaderboard(params);
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Leaderboard response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function getRankingDistribution(
params?: RankingControllerGetLeaderboardDistributionParams,
): Promise<RankingControllerGetLeaderboardDistributionResult["data"]> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: "rankings.getRankingDistribution",
  });
const data =
await getLeaderboards().rankingControllerGetLeaderboardDistribution(params);
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Leaderboard distribution response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function getTopMovers(
params?: RankingControllerGetTopMoversParams,
): Promise<RankingControllerGetTopMoversResult["data"]> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: "rankings.getTopMovers",
  });
const data = await getLeaderboards().rankingControllerGetTopMovers(params);
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Top movers response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function getUserRanking(
userId: string,
): Promise<RankingControllerGetUserRankResult["data"]> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: `rankings.getUserRanking(${userId})`,
  });
const data = await getLeaderboards().rankingControllerGetUserRank(userId);
return data.data ?? null;
}

export async function getUserRankingHistory(
userId: string,
params?: RankingControllerGetUserRankingHistoryParams,
): Promise<RankingControllerGetUserRankingHistoryResult["data"]> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: `rankings.getUserRankingHistory(${userId})`,
  });
const data =
await getLeaderboards().rankingControllerGetUserRankingHistory(userId, params);
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "User ranking history response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function getUserRankForPeriod(
userId: string,
params: RankingControllerGetUserRankForPeriodParams,
): Promise<RankingControllerGetUserRankForPeriodResult["data"]> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: `rankings.getUserRankForPeriod(${userId})`,
  });
const data = await getLeaderboards().rankingControllerGetUserRankForPeriod(
userId,
params,
  );
return data.data ?? null;
}
