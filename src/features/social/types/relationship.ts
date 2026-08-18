

import type { ErrorCode } from "@/lib/api/error-codes";

export type Relationship =
| "self"
  | "friend"
  | "incoming_request"
  | "outgoing_request"
  | "following"
  | "follower"
  | "blocked"
  | "blocked_by"
  | "none";

export const RELATIONSHIP_VALUES = [
"self",
"friend",
"incoming_request",
"outgoing_request",
"following",
"follower",
"blocked",
"blocked_by",
"none",
] as const satisfies readonly Relationship[];

export type SocialErrorCode =
| "SOCIAL_FRIEND_REQUEST_NOT_FOUND"
  | "SOCIAL_FRIEND_REQUEST_FORBIDDEN"
  | "SOCIAL_FRIEND_LIST_FORBIDDEN"
  | "SOCIAL_SELF_FRIEND_REQUEST"
  | "SOCIAL_ALREADY_FRIENDS"
  | "SOCIAL_BLOCKED_USER"
  | "SOCIAL_USER_BLOCKED"
  | "SOCIAL_PENDING_REQUEST_EXISTS"
  | "SOCIAL_FRIENDSHIP_NOT_FOUND"
  | "SOCIAL_USER_NOT_BLOCKED"
  | "SOCIAL_FOLLOW_NOT_FOUND"
  | "GLOBAL_BAD_REQUEST"
  | "GLOBAL_VALIDATION_FAILED"
  | "GLOBAL_UNAUTHENTICATED"
  | "GLOBAL_FORBIDDEN"
  | "GLOBAL_NOT_FOUND"
  | "GLOBAL_CONFLICT"
  | "GLOBAL_RATE_LIMITED"
  | "GLOBAL_INTERNAL_ERROR";

export const SOCIAL_ERROR_CODES = [
"SOCIAL_FRIEND_REQUEST_NOT_FOUND",
"SOCIAL_FRIEND_REQUEST_FORBIDDEN",
"SOCIAL_FRIEND_LIST_FORBIDDEN",
"SOCIAL_SELF_FRIEND_REQUEST",
"SOCIAL_ALREADY_FRIENDS",
"SOCIAL_BLOCKED_USER",
"SOCIAL_USER_BLOCKED",
"SOCIAL_PENDING_REQUEST_EXISTS",
"SOCIAL_FRIENDSHIP_NOT_FOUND",
"SOCIAL_USER_NOT_BLOCKED",
"SOCIAL_FOLLOW_NOT_FOUND",
"GLOBAL_BAD_REQUEST",
"GLOBAL_VALIDATION_FAILED",
"GLOBAL_UNAUTHENTICATED",
"GLOBAL_FORBIDDEN",
"GLOBAL_NOT_FOUND",
"GLOBAL_CONFLICT",
"GLOBAL_RATE_LIMITED",
"GLOBAL_INTERNAL_ERROR",
] as const satisfies readonly SocialErrorCode[];

export function isSocialErrorCode(code: string | undefined): code is SocialErrorCode {
if (!code) return false;
return (SOCIAL_ERROR_CODES as readonly string[]).includes(code);
}

export function asErrorCode(code: SocialErrorCode | undefined): ErrorCode {

return (code ?? "GLOBAL_INTERNAL_ERROR") as ErrorCode;
}

export interface RelationshipStatusDto {
readonly userId: string;
readonly relationship: Relationship;
readonly since: string;
readonly followId: never;
readonly friendshipId: never;
}

export interface SocialUserSummaryDto {
readonly id: string;
readonly userId: string;
readonly userName: string;
readonly displayName: string | null;
readonly avatarUrl: string | null;
readonly isPrivate: boolean;
readonly createdAt: string;
}

export interface SocialCountsDto {
readonly followers: number;
readonly following: number;
readonly friends: number;
readonly blocked: number;
readonly pendingIncomingCount?: number;
readonly pendingOutgoingCount?: number;
}

export interface SocialBlockedUserDto {
readonly id: string;
readonly userId: string;
readonly user: SocialUserSummaryDto;
readonly since: string;
}

export type SocialSuggestionReason =
| "mutual_friends"
  | "shared_tags"
  | "shared_activity"
  | "popular";

export interface SocialSuggestionItemDto {
readonly id: string;
readonly user: SocialUserSummaryDto;
readonly mutualFriendsCount: number;
readonly reason: SocialSuggestionReason;
}

export type SocialFeedItemType =
| "badge_earned"
  | "badge_revoked"
  | "rank_milestone"
  | "peak_rank_achieved"
  | "tournament_joined"
  | "tournament_completed"
  | "tournament_won"
  | "comment_created"
  | "quiz_completed"
  | "quiz_milestone"
  | "instance_created"
  | "instance_joined"
  | "instance_completed";

export type SocialFeedItemPayload =
| { readonly type: "badge_earned"; readonly badgeId: string; readonly badgeSlug: string }
  | { readonly type: "badge_revoked"; readonly badgeId: string; readonly badgeSlug: string }
  | { readonly type: "rank_milestone"; readonly period: "daily" | "weekly" | "monthly" | "all_time"; readonly rank: number }
  | { readonly type: "peak_rank_achieved"; readonly period: "daily" | "weekly" | "monthly" | "all_time"; readonly rank: number }
  | { readonly type: "tournament_joined"; readonly tournamentId: string; readonly tournamentSlug: string }
  | { readonly type: "tournament_completed"; readonly tournamentId: string; readonly tournamentSlug: string; readonly placement: number }
  | { readonly type: "tournament_won"; readonly tournamentId: string; readonly tournamentSlug: string }
  | { readonly type: "comment_created"; readonly commentId: string; readonly quizId: string; readonly quizSlug: string; readonly excerpt: string }
  | { readonly type: "quiz_completed"; readonly quizId: string; readonly quizSlug: string; readonly scorePercent: number }
  | { readonly type: "quiz_milestone"; readonly quizId: string; readonly quizSlug: string; readonly milestone: "first_completion" | "perfect_score" | "nth_completion" }
  | { readonly type: "instance_created"; readonly instanceId: string; readonly quizSlug: string }
  | { readonly type: "instance_joined"; readonly instanceId: string; readonly quizSlug: string }
  | { readonly type: "instance_completed"; readonly instanceId: string; readonly quizSlug: string; readonly placement: number };

export interface SocialFeedItemDto {
readonly id: string;
readonly type: SocialFeedItemType;
readonly at: string;
readonly actorUser: SocialUserSummaryDto;
readonly payload: SocialFeedItemPayload;
}

export type SocialActivityItemDto = SocialFeedItemDto;

export interface SocialMutualDto {
readonly id: string;
readonly user: SocialUserSummaryDto;
readonly mutualFriendsCount: number;
readonly mutualFollowersCount: number;
}

export interface SocialFriendRequestDto {
readonly id: string;
readonly requesterId: string;
readonly addresseeId: string;
readonly requester: SocialUserSummaryDto;
readonly createdAt: string;
}

export interface SocialUserStatsDto {
readonly friends: number;
readonly followers: number;
readonly following: number;
}

export interface SocialMyAnalyticsDto {
readonly friends: number;
readonly followers: number;
readonly following: number;
readonly growth30Days: number;
}

export type SocialFriendLeaderboardPeriod = "weekly" | "monthly" | "all_time";

export interface FriendLeaderboardEntryDto {
readonly rank: number;
readonly userId: string;
readonly userName: string;
readonly displayName: string | null;
readonly avatarUrl: string | null;
readonly xp: number;
readonly friendSince: string;
}

export interface SocialFriendLeaderboardDto {
readonly period: SocialFriendLeaderboardPeriod;
readonly entries: readonly FriendLeaderboardEntryDto[];
readonly currentUserRank: number | null;
readonly totalParticipants: number;
}

export interface RespondFriendRequestDto {
readonly action: "accept" | "decline";
}

export type BlockUserDto = Record<string, never>;

export type SocialPaginationKind = "offset" | "cursor";

export interface SocialPaginationParams {
readonly limit?: number;
readonly cursor?: string;
readonly offset?: number;
}

export type SocialPage<T> =
| {
readonly items: readonly T[];
readonly paginationKind: "offset";
readonly total: number;
readonly offset: number;
readonly limit: number;
    }
  | {
readonly items: readonly T[];
readonly paginationKind: "cursor";
readonly nextCursor: string | null;
readonly limit: number;
    };

export const SOCIAL_CACHE_KEYS = {

makeRelationshipKey(targetUserId: string) {
return ["social", "v1", "relationship", targetUserId] as const;
  },

makeFollowersKey(userId: string) {
return ["social", "v1", "followers", userId] as const;
  },

makeFollowingKey(userId: string) {
return ["social", "v1", "following", userId] as const;
  },

makeFriendsKey(userId: string) {
return ["social", "v1", "friends", userId] as const;
  },

makeBlockedKey() {
return ["social", "v1", "blocked"] as const;
  },

makeIncomingRequestsKey() {
return ["social", "v1", "requests", "incoming"] as const;
  },

makeOutgoingRequestsKey() {
return ["social", "v1", "requests", "outgoing"] as const;
  },

makeSuggestionsKey() {
return ["social", "v1", "suggestions"] as const;
  },

makeSearchSuggestionsKey() {
return ["social", "v1", "search-suggestions"] as const;
  },

makeUserSearchKey(query: string, pageKey: string) {
return ["social", "v1", "user-search", query, pageKey] as const;
  },

makeTrendingUsersKey() {
return ["social", "v1", "trending"] as const;
  },

makeMutualFriendsKey(targetUserId: string) {
return ["social", "v1", "mutual-friends", targetUserId] as const;
  },

makeMutualFollowersKey(targetUserId: string) {
return ["social", "v1", "mutual-followers", targetUserId] as const;
  },

makeUserActivityKey(userId: string) {
return ["social", "v1", "user-activity", userId] as const;
  },

makeSocialCountsKey(userId: string) {
return ["social", "v1", "counts", userId] as const;
  },

makeUserSocialStatsKey(userId: string) {
return ["social", "v1", "user-stats", userId] as const;
  },

makeMySocialAnalyticsKey() {
return ["social", "v1", "my-analytics"] as const;
  },

makeFriendLeaderboardKey(period: "daily" | "weekly" | "monthly" | "all_time") {
return ["social", "v1", "friend-leaderboard", period] as const;
  },

makeFeedKey(viewerUserId: string) {
return ["social", "v1", "feed", viewerUserId] as const;
  },
} as const;

export type SocialCacheKeyFactory = keyof typeof SOCIAL_CACHE_KEYS;