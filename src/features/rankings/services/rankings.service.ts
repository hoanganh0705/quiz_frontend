/**
 * `rankings.service.ts` — Rankings and leaderboard service.
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.F4.
 *
 * ## Pattern
 *
 * Thin SDK pass-throughs with Sentry breadcrumbs and `data` envelope
 * unwrapping. Follows the same discipline as `tournaments.service.ts`:
 *
 *   - Pure forwarders — no side-effects, no cache mutations.
 *   - `ApiError` is propagated unchanged so callers can read `apiError.code`.
 *   - One Sentry breadcrumb per call.
 *   - If the SDK response is missing `data` (malformed), throw a
 *     `GLOBAL_INTERNAL_ERROR`.
 */

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

// ─── My ranking ──────────────────────────────────────────────────────────

/**
 * `GET /api/v1/leaderboard/me`
 *
 * Returns the authenticated user's rank across all periods (weekly, monthly,
 * all-time) and peak ranks achieved. Returns a "ghost" response with null
 * ranks if the user has no ranking data.
 */
export async function getMyRanking(): Promise<RankingControllerGetMyRankResult["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: "rankings.getMyRanking",
  });
  const data = await getLeaderboards().rankingControllerGetMyRank();
  return data.data ?? null;
}

/**
 * `GET /api/v1/leaderboard/me/rank`
 *
 * Returns the authenticated user's rank for a specific period.
 * Returns `null` if the user has no XP in that period.
 */
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

/**
 * `GET /api/v1/leaderboard/me/percentile`
 *
 * Returns the authenticated user's percentile ranking.
 * All fields are nullable if the user has no rank.
 */
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

/**
 * `GET /api/v1/leaderboard/me/milestones`
 *
 * Returns ranking milestones (TOP_100, TOP_10, TOP_1) achieved by the user.
 */
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

/**
 * `GET /api/v1/leaderboard/me/history`
 *
 * Returns the authenticated user's ranking history over time.
 */
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

/**
 * `GET /api/v1/leaderboard/me/peak-ranks`
 *
 * Returns peak ranks achieved across all periods.
 */
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

/**
 * `GET /api/v1/leaderboard/me/nearby`
 *
 * Returns leaderboard entries above, below, and at the authenticated user's position.
 */
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

/**
 * `GET /api/v1/leaderboard/me/movement`
 *
 * Returns rank movement data (rank changes) for the authenticated user.
 */
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

// ─── Public leaderboard ─────────────────────────────────────────────────

/**
 * `GET /api/v1/leaderboard`
 *
 * Returns the global leaderboard with optional period filter.
 * `userPosition` is always `null` on this public variant.
 */
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

/**
 * `GET /api/v1/leaderboard/distribution`
 *
 * Returns distribution statistics grouped into percentile buckets.
 */
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

/**
 * `GET /api/v1/leaderboard/top-movers`
 *
 * Returns users with the largest positive ranking movement.
 */
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

// ─── Public user ranking ────────────────────────────────────────────────

/**
 * `GET /api/v1/leaderboard/users/:userId`
 */
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

/**
 * `GET /api/v1/leaderboard/users/:userId/history`
 */
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

/**
 * `GET /api/v1/leaderboard/users/:userId/rank`
 */
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
