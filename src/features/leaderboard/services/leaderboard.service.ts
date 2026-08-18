

import { getLeaderboards } from '@/lib/api';

import type {
RankingControllerGetGlobalLeaderboardPeriod,
} from '@/lib/api/generated/schemas/rankingControllerGetGlobalLeaderboardPeriod';

export type {
RankingControllerGetGlobalLeaderboardResult,
} from '@/lib/api/generated/leaderboards/leaderboards';

export type LeaderboardPeriod = RankingControllerGetGlobalLeaderboardPeriod;

export interface GetLeaderboardParams {
limit?: number;
offset?: number;
}

export interface GetLeaderboardWithPaginationParams {
limit: number;
offset: number;
}

export async function getLeaderboard(
period: LeaderboardPeriod,
params?: GetLeaderboardParams,
) {
const sdk = getLeaderboards();
return sdk.rankingControllerGetGlobalLeaderboard({
period,
...(params?.limit !== undefined ? { limit: params.limit } : {}),
...(params?.offset !== undefined ? { offset: params.offset } : {}),
  });
}

export async function getLeaderboardWithPagination(
period: LeaderboardPeriod,
params: GetLeaderboardWithPaginationParams,
) {
const sdk = getLeaderboards();
return sdk.rankingControllerGetGlobalLeaderboard({
period,
limit: params.limit,
offset: params.offset,
  });
}