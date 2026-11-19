"use client";

import { getQueryClient } from "@/providers/QueryProvider";

import {
  RANKING_CACHE_KEYS,
  DEFAULT_RANKING_LEADERBOARD_FILTERS,
} from "@/features/rankings/types/ranking.types";

export {
  RANKING_CACHE_KEYS,
  DEFAULT_RANKING_LEADERBOARD_FILTERS,
} from "@/features/rankings/types/ranking.types";

export type RankingLeaderboardKey = ReturnType<
  typeof RANKING_CACHE_KEYS.leaderboard
>;

export type RankingUserKey = ReturnType<typeof RANKING_CACHE_KEYS.user>;

export async function invalidateRankingCaches(options?: {
  skipLeaderboard?: boolean;
  skipUserSummary?: boolean;
}): Promise<void> {
  const { skipLeaderboard = false, skipUserSummary = false } = options ?? {};

  const qc = getQueryClient();
  const invalidations: Promise<void>[] = [];
  if (!skipUserSummary) {
    invalidations.push(
      qc.invalidateQueries({ queryKey: RANKING_CACHE_KEYS.mySummary() }),
      qc.invalidateQueries({ queryKey: RANKING_CACHE_KEYS.myHistory() }),
      qc.invalidateQueries({
        queryKey: RANKING_CACHE_KEYS.myMilestones(),
      }),
    );
  }
  if (!skipLeaderboard) {
    invalidations.push(
      qc.invalidateQueries({
        queryKey: RANKING_CACHE_KEYS.leaderboard(
          DEFAULT_RANKING_LEADERBOARD_FILTERS,
        ),
      }),
    );
  }
  await Promise.all(invalidations);
}

export async function invalidateUserRankingCache(
  userId: string,
): Promise<void> {
  const qc = getQueryClient();
  await qc.invalidateQueries({ queryKey: RANKING_CACHE_KEYS.user(userId) });
}
