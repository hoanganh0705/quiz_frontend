import * as Sentry from "@sentry/nextjs";

import { getLeaderboards, unwrapEnvelope } from "@/lib/api";

import type {
  RankingControllerGetGlobalLeaderboardResult,
  RankingControllerGetLeaderboardDistributionResult,
  RankingControllerGetMyPeakRanksResult,
  RankingControllerGetMyPercentileResult,
  RankingControllerGetMyRankForPeriodResult,
  RankingControllerGetMyRankingHistoryResult,
  RankingControllerGetMyRankingMilestonesResult,
  RankingControllerGetMyRankMovementResult,
  RankingControllerGetMyRankResult,
  RankingControllerGetNearbyRanksResult,
  RankingControllerGetTopMoversResult,
  RankingControllerGetUserRankForPeriodResult,
  RankingControllerGetUserRankingHistoryResult,
  RankingControllerGetUserRankResult,
} from "@/lib/api/generated/leaderboards/leaderboards";
import type {
  RankingControllerGetGlobalLeaderboardParams,
  RankingControllerGetLeaderboardDistributionParams,
  RankingControllerGetMyPercentileParams,
  RankingControllerGetMyRankForPeriodParams,
  RankingControllerGetMyRankMovementParams,
  RankingControllerGetNearbyRanksParams,
  RankingControllerGetTopMoversParams,
  RankingControllerGetUserRankForPeriodParams,
  RankingControllerGetUserRankingHistoryParams,
} from "@/lib/api/generated/schemas";

export async function getMyRanking(): Promise<
  RankingControllerGetMyRankResult["data"]
> {
  Sentry.addBreadcrumb({
    category: "rankings:service",
    message: "rankings.getMyRanking",
  });
  const data = await getLeaderboards().rankingControllerGetMyRank();
  return data.data ?? null;
}

export async function getMyRankForPeriod(
  params: RankingControllerGetMyRankForPeriodParams,
): Promise<RankingControllerGetMyRankForPeriodResult["data"]> {
  Sentry.addBreadcrumb({
    category: "rankings:service",
    message: "rankings.getMyRankForPeriod",
  });
  const data =
    await getLeaderboards().rankingControllerGetMyRankForPeriod(params);
  return data.data ?? null;
}

export async function getMyPercentile(
  params?: RankingControllerGetMyPercentileParams,
): Promise<RankingControllerGetMyPercentileResult["data"]> {
  Sentry.addBreadcrumb({
    category: "rankings:service",
    message: "rankings.getMyPercentile",
  });
  const data = await getLeaderboards().rankingControllerGetMyPercentile(params);
  return data.data ?? null;
}

export async function getMyRankingMilestones(): Promise<
  RankingControllerGetMyRankingMilestonesResult["data"]
> {
  Sentry.addBreadcrumb({
    category: "rankings:service",
    message: "rankings.getMyRankingMilestones",
  });
  const response =
    await getLeaderboards().rankingControllerGetMyRankingMilestones();
  return unwrapEnvelope(
    response,
    "Ranking milestones response missing data envelope",
  );
}

export async function getMyRankingHistory(): Promise<
  RankingControllerGetMyRankingHistoryResult["data"]
> {
  Sentry.addBreadcrumb({
    category: "rankings:service",
    message: "rankings.getMyRankingHistory",
  });
  const response =
    await getLeaderboards().rankingControllerGetMyRankingHistory();
  return unwrapEnvelope(
    response,
    "Ranking history response missing data envelope",
  );
}

export async function getMyPeakRanks(): Promise<
  RankingControllerGetMyPeakRanksResult["data"]
> {
  Sentry.addBreadcrumb({
    category: "rankings:service",
    message: "rankings.getMyPeakRanks",
  });
  const response = await getLeaderboards().rankingControllerGetMyPeakRanks();
  return unwrapEnvelope(response, "Peak ranks response missing data envelope");
}

export async function getNearbyRanks(
  params?: RankingControllerGetNearbyRanksParams,
): Promise<RankingControllerGetNearbyRanksResult["data"]> {
  Sentry.addBreadcrumb({
    category: "rankings:service",
    message: "rankings.getNearbyRanks",
  });
  const response =
    await getLeaderboards().rankingControllerGetNearbyRanks(params);
  return unwrapEnvelope(
    response,
    "Nearby ranks response missing data envelope",
  );
}

export async function getMyRankMovement(
  params?: RankingControllerGetMyRankMovementParams,
): Promise<RankingControllerGetMyRankMovementResult["data"]> {
  Sentry.addBreadcrumb({
    category: "rankings:service",
    message: "rankings.getMyRankMovement",
  });
  const response =
    await getLeaderboards().rankingControllerGetMyRankMovement(params);
  return unwrapEnvelope(
    response,
    "Rank movement response missing data envelope",
  );
}

export async function getRankingLeaderboard(
  params?: RankingControllerGetGlobalLeaderboardParams,
): Promise<RankingControllerGetGlobalLeaderboardResult["data"]> {
  Sentry.addBreadcrumb({
    category: "rankings:service",
    message: "rankings.getRankingLeaderboard",
  });
  const response =
    await getLeaderboards().rankingControllerGetGlobalLeaderboard(params);
  return unwrapEnvelope(
    response,
    "Leaderboard response missing data envelope",
  );
}

export async function getRankingDistribution(
  params?: RankingControllerGetLeaderboardDistributionParams,
): Promise<RankingControllerGetLeaderboardDistributionResult["data"]> {
  Sentry.addBreadcrumb({
    category: "rankings:service",
    message: "rankings.getRankingDistribution",
  });
  const response =
    await getLeaderboards().rankingControllerGetLeaderboardDistribution(params);
  return unwrapEnvelope(
    response,
    "Leaderboard distribution response missing data envelope",
  );
}

export async function getTopMovers(
  params?: RankingControllerGetTopMoversParams,
): Promise<RankingControllerGetTopMoversResult["data"]> {
  Sentry.addBreadcrumb({
    category: "rankings:service",
    message: "rankings.getTopMovers",
  });
  const response =
    await getLeaderboards().rankingControllerGetTopMovers(params);
  return unwrapEnvelope(response, "Top movers response missing data envelope");
}

export async function getUserRanking(
  userId: string,
): Promise<RankingControllerGetUserRankResult["data"]> {
  Sentry.addBreadcrumb({
    category: "rankings:service",
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
    category: "rankings:service",
    message: `rankings.getUserRankingHistory(${userId})`,
  });
  const response =
    await getLeaderboards().rankingControllerGetUserRankingHistory(
      userId,
      params,
    );
  return unwrapEnvelope(
    response,
    "User ranking history response missing data envelope",
  );
}

export async function getUserRankForPeriod(
  userId: string,
  params: RankingControllerGetUserRankForPeriodParams,
): Promise<RankingControllerGetUserRankForPeriodResult["data"]> {
  Sentry.addBreadcrumb({
    category: "rankings:service",
    message: `rankings.getUserRankForPeriod(${userId})`,
  });
  const data = await getLeaderboards().rankingControllerGetUserRankForPeriod(
    userId,
    params,
  );
  return data.data ?? null;
}
