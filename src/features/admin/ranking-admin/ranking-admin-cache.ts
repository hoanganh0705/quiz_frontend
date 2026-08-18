

import { mutate } from 'swr';

import {
RANKING_CACHE_KEYS,
DEFAULT_RANKING_LEADERBOARD_FILTERS,
} from '@/features/rankings/types/ranking.types';

export {
RANKING_CACHE_KEYS,
DEFAULT_RANKING_LEADERBOARD_FILTERS,
} from '@/features/rankings/types/ranking.types';

export type RankingLeaderboardKey = ReturnType<
typeof RANKING_CACHE_KEYS.leaderboard
>;

export type RankingUserKey = ReturnType<typeof RANKING_CACHE_KEYS.user>;

export async function invalidateRankingCaches(options?: {

skipLeaderboard?: boolean;

skipUserSummary?: boolean;
}): Promise<void> {
const { skipLeaderboard = false, skipUserSummary = false } = options ?? {};

await Promise.all([

skipUserSummary ? Promise.resolve() : mutate(RANKING_CACHE_KEYS.mySummary()),

skipLeaderboard
? Promise.resolve()
: mutate(RANKING_CACHE_KEYS.leaderboard(DEFAULT_RANKING_LEADERBOARD_FILTERS)),

skipUserSummary ? Promise.resolve() : mutate(RANKING_CACHE_KEYS.myHistory()),

skipUserSummary ? Promise.resolve() : mutate(RANKING_CACHE_KEYS.myMilestones()),
  ]);
}

export async function invalidateUserRankingCache(userId: string): Promise<void> {
await mutate(RANKING_CACHE_KEYS.user(userId));
}
