

import type {
SocialControllerGetFriendLeaderboardResult,
SocialControllerGetMySocialAnalyticsResult,
SocialControllerGetUserSocialStatsResult,
} from "@/lib/api/generated/social/social";

import type {
FriendLeaderboardDto,
FriendLeaderboardEntryDto,
SocialMyAnalyticsDto,
SocialUserStatsDto,
} from "@/features/social/types/analytics";

export function toSocialUserStats(
input: unknown,
): SocialUserStatsDto {
const wire = (input ?? {}) as {
friends?: unknown;
followers?: unknown;
following?: unknown;
staleAt?: unknown;
isStale?: unknown;
  };
return {
friends: typeof wire.friends === "number" ? wire.friends : 0,
followers: typeof wire.followers === "number" ? wire.followers : 0,
following: typeof wire.following === "number" ? wire.following : 0,
...(typeof wire.staleAt === "string" ? { staleAt: wire.staleAt } : {}),
...(typeof wire.isStale === "boolean" ? { isStale: wire.isStale } : {}),
  };
}

export function toSocialUserStatsFromEnvelope(
envelope: SocialControllerGetUserSocialStatsResult,
): SocialUserStatsDto {
return toSocialUserStats(envelope?.data);
}

export function toSocialMyAnalytics(input: unknown): SocialMyAnalyticsDto {
const wire = (input ?? {}) as {
friends?: unknown;
followers?: unknown;
following?: unknown;
growth30Days?: unknown;
staleAt?: unknown;
isStale?: unknown;
  };
return {
friends: typeof wire.friends === "number" ? wire.friends : 0,
followers: typeof wire.followers === "number" ? wire.followers : 0,
following: typeof wire.following === "number" ? wire.following : 0,
growth30Days:
typeof wire.growth30Days === "number" ? wire.growth30Days : 0,
...(typeof wire.staleAt === "string" ? { staleAt: wire.staleAt } : {}),
...(typeof wire.isStale === "boolean" ? { isStale: wire.isStale } : {}),
  };
}

export function toSocialMyAnalyticsFromEnvelope(
envelope: SocialControllerGetMySocialAnalyticsResult,
): SocialMyAnalyticsDto {
return toSocialMyAnalytics(envelope?.data);
}

export function toFriendLeaderboardEntry(
input: unknown,
): FriendLeaderboardEntryDto {
const wire = (input ?? {}) as {
rank?: unknown;
userId?: unknown;
username?: unknown;
displayName?: unknown;
avatarUrl?: unknown;
xp?: unknown;
friendSince?: unknown;
  };
return {
rank: typeof wire.rank === "number" ? wire.rank : 0,
userId: typeof wire.userId === "string" ? wire.userId : "",
username: typeof wire.username === "string" ? wire.username : "",
displayName:
typeof wire.displayName === "string" ? wire.displayName : null,
avatarUrl: typeof wire.avatarUrl === "string" ? wire.avatarUrl : null,
xp: typeof wire.xp === "number" ? wire.xp : 0,
friendSince:
typeof wire.friendSince === "string" ? wire.friendSince : "",
  };
}

export function toFriendLeaderboard(
input: unknown,
): FriendLeaderboardDto {
const wire = (input ?? {}) as {
period?: unknown;
entries?: unknown;
currentUserRank?: unknown;
totalParticipants?: unknown;
staleAt?: unknown;
isStale?: unknown;
  };
const period =
wire.period === "weekly" ||
wire.period === "monthly" ||
wire.period === "all_time"
? wire.period
: "weekly";
const entries = Array.isArray(wire.entries)
? wire.entries.map((e) => toFriendLeaderboardEntry(e))
: [];
const rawRank = wire.currentUserRank as
| { rank?: unknown; xp?: unknown }
    | null
    | undefined;
const currentUserRank =
rawRank !== null &&
rawRank !== undefined &&
typeof rawRank === "object" &&
typeof rawRank.rank === "number" &&
typeof rawRank.xp === "number"
? { rank: rawRank.rank, xp: rawRank.xp }
: null;
return {
period,
entries,
currentUserRank,
totalParticipants:
typeof wire.totalParticipants === "number"
? wire.totalParticipants
: 0,
...(typeof wire.staleAt === "string" ? { staleAt: wire.staleAt } : {}),
...(typeof wire.isStale === "boolean" ? { isStale: wire.isStale } : {}),
  };
}

export function toFriendLeaderboardFromEnvelope(
envelope: SocialControllerGetFriendLeaderboardResult,
): FriendLeaderboardDto {
return toFriendLeaderboard(envelope?.data);
}