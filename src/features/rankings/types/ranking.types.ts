

import type {
UserRankResponseDto,
RankingMilestoneDto,
RankingHistoryItemDto,
} from "@/lib/api/generated/schemas";

export type RankingPeriod = "weekly" | "monthly" | "all_time";

export interface RankingLeaderboardFilters {

period?: RankingPeriod;

cursor?: string;

limit?: number;
}

export interface RankingHistoryFilters {

cursor?: string;

limit?: number;
}

export const DEFAULT_RANKING_LEADERBOARD_FILTERS: RankingLeaderboardFilters = {
period: undefined,
cursor: undefined,
limit: undefined,
};

export interface RankingLeaderboardPage {
items: readonly RankingLeaderboardEntry[];
nextOffset: number | null;
hasMore: boolean;
limit: number;
userPosition: RankingUserPosition | null;
}

export type RankingLeaderboardEntry = {
rank: number;
denseRank: number;
userId: string;
displayName: string;
avatarUrl?: string | null;
xp: number;
isTied: boolean;
isCurrentUser?: boolean | null;

id: string;
};

export type RankingUserPosition = {
rank: number;
denseRank: number;
percentile: number;
percentileLabel: string;
xp: number;
xpToNextRank?: number | null;
nextRankXp?: number | null;
trend: "up" | "down" | "same" | "new";
trendAmount?: number | null;
};

export type RankingSummary = {
userId: string;
globalRank: number | null;
totalScore: number;
level: number;
updatedAt: string;
} & {

id: string;
};

export type UserRanking = RankingSummary;

export type RankingHistoryEntry = RankingHistoryItemDto & {

id: string;
};

export type RankingMilestone = RankingMilestoneDto & {

id: string;
};

export interface RankingFreshness {
isStale: boolean;
lastValidatedAt: string | null;
}

export type RankingErrorCode =
| "RANKING_NOT_FOUND"
  | "RANKING_FORBIDDEN"
  | "RANKING_RATE_LIMITED"
  | "RANKING_SERVICE_UNAVAILABLE"
  | "UNAUTHORIZED"
  | "GLOBAL_INTERNAL_ERROR";

export function toRankingSummary(
wire: UserRankResponseDto | null | undefined,
userId: string,
): RankingSummary | null {
if (!wire) return null;
const allTime = wire.global?.allTime ?? null;
return {
userId,
globalRank: allTime?.rank ?? null,
totalScore: allTime?.xp ?? 0,
level: 1,
updatedAt: new Date().toISOString(),
id: userId,
  };
}

export function toUserRanking(
wire: UserRankResponseDto | null | undefined,
userId: string,
): UserRanking | null {
return toRankingSummary(wire, userId);
}

export function toRankingHistoryEntry(
wire: RankingHistoryItemDto,
): RankingHistoryEntry {
return { ...wire, id: wire.date };
}

export function toRankingMilestone(
wire: RankingMilestoneDto,
): RankingMilestone {
return { ...wire, id: wire.milestone };
}

export const RANKING_CACHE_KEYS = {

mySummary() {
return ["rankings", "me", "summary"] as const;
  },

leaderboard(filters: RankingLeaderboardFilters) {
return [
"rankings",
"leaderboard",
filters.period ?? "all",
filters.cursor ?? "",
typeof filters.limit === "number" ? filters.limit : -1,
    ] as const;
  },

myHistory(filters?: RankingHistoryFilters) {
return [
"rankings",
"me",
"history",
filters?.cursor ?? "",
typeof filters?.limit === "number" ? filters.limit : -1,
    ] as const;
  },

myMilestones() {
return ["rankings", "me", "milestones"] as const;
  },

user(userId: string) {
return ["rankings", "user", userId] as const;
  },
} as const;

export interface RankingInvalidationKeys {
summary: ReturnType<typeof RANKING_CACHE_KEYS.mySummary>;
leaderboard: ReturnType<typeof RANKING_CACHE_KEYS.leaderboard>;
history: ReturnType<typeof RANKING_CACHE_KEYS.myHistory>;
milestones: ReturnType<typeof RANKING_CACHE_KEYS.myMilestones>;
}

export function makeRankingInvalidationKeys(): RankingInvalidationKeys {
return {
summary: RANKING_CACHE_KEYS.mySummary(),
leaderboard: RANKING_CACHE_KEYS.leaderboard(DEFAULT_RANKING_LEADERBOARD_FILTERS),
history: RANKING_CACHE_KEYS.myHistory(),
milestones: RANKING_CACHE_KEYS.myMilestones(),
  };
}