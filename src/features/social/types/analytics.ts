

export type AnalyticsPeriod = "week" | "month" | "all";

export const ANALYTICS_PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
week: "This week",
month: "This month",
all: "All time",
};

export type AnalyticsKind = "hub" | "my-analytics" | "stats" | "leaderboard";

export const ANALYTICS_KINDS: readonly AnalyticsKind[] = [
"hub",
"my-analytics",
"stats",
"leaderboard",
] as const;

export interface SocialUserStatsDto {
readonly friends: number;
readonly followers: number;
readonly following: number;

readonly staleAt?: string;
readonly isStale?: boolean;
}

export interface SocialMyAnalyticsDto {
readonly friends: number;
readonly followers: number;
readonly following: number;

readonly growth30Days: number;

readonly staleAt?: string;
readonly isStale?: boolean;
}

export interface FriendLeaderboardEntryDto {
readonly rank: number;
readonly userId: string;
readonly username: string;
readonly displayName: string | null;
readonly avatarUrl: string | null;
readonly xp: number;

readonly friendSince: string;
}

export type FriendLeaderboardPeriod = "weekly" | "monthly" | "all_time";

export const FRIEND_LEADERBOARD_PERIODS: readonly FriendLeaderboardPeriod[] = [
"weekly",
"monthly",
"all_time",
] as const;

export interface FriendLeaderboardDto {
readonly period: FriendLeaderboardPeriod;
readonly entries: readonly FriendLeaderboardEntryDto[];

readonly currentUserRank:
| { rank: number; xp: number }
    | null;
readonly totalParticipants: number;

readonly staleAt?: string;
readonly isStale?: boolean;
}

export function mapAnalyticsPeriodToLeaderboardPeriod(
period: AnalyticsPeriod,
): FriendLeaderboardPeriod {
switch (period) {
case "week":
return "weekly";
case "month":
return "monthly";
case "all":
return "all_time";
  }
}
