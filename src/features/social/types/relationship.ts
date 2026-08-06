/**
 * `relationship.ts` — Epic 6.1 type foundation for the Social Graph &
 * Discovery Hub.
 *
 * Source epic:   Epic 6.1 — Relationship foundations (type layer + cache
 *                keys + DTO adapters).
 * Source story:  Story 6.1.
 * Source ticket: TKT-6.1.C1.
 *
 * ## Purpose
 *
 * Single source of truth for:
 *
 *   - The `Relationship` enum/union every later hook, component, and
 *     mutation in the social story branches on.
 *   - The frontend DTO projections consumed by Stories 6.2 → 6.10 —
 *     these are *projections* of the verified SDK DTOs, not handwritten
 *     backend model duplicates.
 *   - The SWR cache-key factories consumed by every read hook in Batch D
 *     and the mutation hooks in later batches.
 *
 * ## What is NOT in this file
 *
 *   - The DTO adapters that strip leaked `followId` / `friendshipId`
 *     identifiers and normalise offset/cursor pagination shapes. Those
 *     live in `dto-adapters.ts` (TKT-6.1.C2).
 *   - The service wrappers and SWR read hooks. Those live in
 *     `services/social.service.ts` (TKT-6.1.E1) and
 *     `hooks/use*.ts` (TKT-6.1.D1 / D2 / D3).
 *
 * ## `Relationship` enum — value contract
 *
 * The union has exactly nine values:
 *
 *   - `'self'`              — the target user is the viewer.
 *   - `'friend'`            — bidirectional friendship.
 *   - `'incoming_request'`  — the target sent the viewer a friend request.
 *   - `'outgoing_request'`  — the viewer sent the target a friend request.
 *   - `'following'`         — the viewer follows the target (not friends).
 *   - `'follower'`          — the target follows the viewer (not friends).
 *   - `'blocked'`           — the viewer has blocked the target.
 *   - `'blocked_by'`        — the target has blocked the viewer.
 *   - `'none'`              — no relationship.
 *
 * `'self'` and `'none'` are explicitly terminal values — the rest of the
 * story treats them as "the relationship cannot be acted on".
 *
 * ## Internal-id leakage
 *
 * The backend may leak `followId` / `friendshipId` values through
 * response bodies (Master plan Phase 6 Risks line 54). These fields are
 * intentionally typed `never` on `RelationshipStatusDto` below so the
 * rest of the application cannot read them. The DTO adapter
 * (`stripRelationshipInternalIds` in `dto-adapters.ts`) is the single
 * place that touches them and immediately discards them.
 *
 * ## Cache-key conventions
 *
 * Every cache-key factory:
 *
 *   - Lives on the `SOCIAL_CACHE_KEYS` object literal so consumers never
 *     hand-roll a key.
 *   - Returns a frozen tuple (`as const` literal) so equality is by
 *     structural shape — equal inputs always produce equal keys.
 *   - Is pure (no clock, no random) so it is safe to call inside
 *     `useMemo` and `useEffect` dependency arrays.
 */

import type { ErrorCode } from "@/lib/api/error-codes";

// ─── Relationship enum ───────────────────────────────────────────────────

/**
 * The nine stable relationship values between the viewer and a target
 * user. See the file header for the value contract.
 *
 * Frontend code branches on this union directly. Any unknown backend
 * status string is normalised to `'none'` by `toRelationship` in
 * `dto-adapters.ts` — the union is therefore exhaustive from the UI's
 * perspective.
 */
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

/**
 * The exhaustive set of `Relationship` values, locked as a readonly
 * tuple. Used by type-level tests and exhaustive `switch` checks.
 */
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

// ─── Social error code subset ────────────────────────────────────────────

/**
 * The subset of `ErrorCode` the social REST surface emits. Components
 * branch on this union so they can use `getUserCopy(code)` without
 * knowing about codes from unrelated modules.
 *
 * The union deliberately includes the synthesised `GLOBAL_*` codes so a
 * transport-level 401 / 403 / 404 / 5xx still narrows cleanly. The
 * mutation hooks in later stories project their typed code against this
 * union; the read hooks in Batch D do the same.
 */
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

/**
 * Runtime narrowing — `code is SocialErrorCode`.
 */
export function isSocialErrorCode(code: string | undefined): code is SocialErrorCode {
  if (!code) return false;
  return (SOCIAL_ERROR_CODES as readonly string[]).includes(code);
}

/**
 * Convenience: widen a `SocialErrorCode | undefined` to the global
 * `ErrorCode` union. Read hooks re-narrow at the call site; this helper
 * is the canonical bridge between the two unions.
 */
export function asErrorCode(code: SocialErrorCode | undefined): ErrorCode {
  // The cast is structural: `SocialErrorCode` is a strict subset of
  // `ErrorCode` and `ErrorCode` includes its own synthesised codes.
  return (code ?? "GLOBAL_INTERNAL_ERROR") as ErrorCode;
}

// ─── DTO projections ─────────────────────────────────────────────────────

/**
 * The frontend projection of the relationship status between the
 * viewer and a target user.
 *
 * The SDK DTO (`RelationshipStatusDto`) emits five independent booleans
 * (`isFriend`, `hasPendingRequest`, `isFollower`, `isFollowing`,
 * `isBlocked`, `isBlockedBy`). The DTO adapter
 * (`stripRelationshipInternalIds` + `toRelationship` in
 * `dto-adapters.ts`) collapses them into the single `relationship`
 * field on this projection. Consumers never see the SDK boolean tuple.
 *
 * `followId` and `friendshipId` are typed as `never` so the rest of the
 * application cannot read them — the adapter is the single point that
 * touches them and immediately discards them (Phase 6 Risks line 54).
 *
 * `userId` is the stable identifier; the application must persist and
 * route by `userId`, never by an internal-id field.
 */
export interface RelationshipStatusDto {
  readonly userId: string;
  readonly relationship: Relationship;
  readonly since: string;
  readonly followId: never;
  readonly friendshipId: never;
}

/**
 * A minimal projection of a user the social surface references.
 *
 * `id` is the stable identifier and aliases `userId` for SWR
 * deduplication (`appendUniqueById` requires every item to expose
 * `id`). `isPrivate` controls whether the profile can be expanded by
 * non-friends.
 */
export interface SocialUserSummaryDto {
  readonly id: string;
  readonly userId: string;
  readonly userName: string;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
  readonly isPrivate: boolean;
  readonly createdAt: string;
}

/**
 * Aggregated social counters for a user.
 *
 * `pendingIncomingCount` and `pendingOutgoingCount` are viewer-only —
 * the backend only returns them for the requester. Consumers that read
 * this projection for an arbitrary user must treat those two fields as
 * optional / zero.
 */
export interface SocialCountsDto {
  readonly followers: number;
  readonly following: number;
  readonly friends: number;
  readonly blocked: number;
  readonly pendingIncomingCount?: number;
  readonly pendingOutgoingCount?: number;
}

/**
 * A blocked-user row.
 *
 * The SDK `BlockedUserDto` exposes `blockedId` only; the frontend
 * projection joins the viewer-known profile so blocked-list UI does
 * not have to fan-out an extra fetch per row. The `since` field is the
 * timestamp when the viewer blocked the user.
 */
export interface SocialBlockedUserDto {
  readonly id: string;
  readonly userId: string;
  readonly user: SocialUserSummaryDto;
  readonly since: string;
}

/**
 * Why a user was suggested.
 *
 * `mutual_friends` — at least one mutual friend.
 * `shared_tags`     — the viewer and the suggestion share tags.
 * `shared_activity` — both users recently completed quizzes on the same
 *                     tag.
 * `popular`         — the suggestion is trending globally.
 */
export type SocialSuggestionReason =
  | "mutual_friends"
  | "shared_tags"
  | "shared_activity"
  | "popular";

/**
 * A suggested-user row.
 */
export interface SocialSuggestionItemDto {
  readonly id: string;
  readonly user: SocialUserSummaryDto;
  readonly mutualFriendsCount: number;
  readonly reason: SocialSuggestionReason;
}

// ─── Feed payload discriminated union ────────────────────────────────────

/**
 * Activity type discriminator for the social feed. Mirrors the SDK
 * `SocialFeedItemDtoType` enum (badge / rank / tournament / instance /
 * quiz / comment activity).
 *
 * The list is locked here so the discriminated union below is
 * exhaustive. The SDK regenerates this list; if the backend adds a new
 * activity type, add the literal to this union AND a corresponding
 * `SocialFeedItemPayload` arm — TypeScript will flag any switch that
 * misses the new arm.
 */
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

/**
 * Activity-type payload union. Every variant carries the stable
 * identifiers (`id`s) the UI needs to render the row without an extra
 * fetch — full expansion is the row-detail page's responsibility.
 */
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

/**
 * A single activity in the social feed. The `id` alias makes the item
 * compatible with `appendUniqueById` so SWR can deduplicate across
 * pages.
 */
export interface SocialFeedItemDto {
  readonly id: string;
  readonly type: SocialFeedItemType;
  readonly at: string;
  readonly actorUser: SocialUserSummaryDto;
  readonly payload: SocialFeedItemPayload;
}

// ─── Activity payload discriminated union (user activity) ────────────────

/**
 * A per-user activity item (the `/social/users/:id/activity` endpoint).
 *
 * The shape is identical to `SocialFeedItemDto` but is keyed by the
 * target user rather than the viewer. We type-aliase it to keep the
 * intent explicit (the cache key is per-user, not per-feed).
 */
export type SocialActivityItemDto = SocialFeedItemDto;

// ─── Mutual projection ──────────────────────────────────────────────────

/**
 * A mutual-connection row (friend or follower shared with the viewer).
 */
export interface SocialMutualDto {
  readonly id: string;
  readonly user: SocialUserSummaryDto;
  readonly mutualFriendsCount: number;
  readonly mutualFollowersCount: number;
}

// ─── Friend request projection ───────────────────────────────────────────

/**
 * A pending friend request. `requesterId` is the user who sent the
 * request; `addresseeId` is the user who received it.
 */
export interface SocialFriendRequestDto {
  readonly id: string;
  readonly requesterId: string;
  readonly addresseeId: string;
  readonly requester: SocialUserSummaryDto;
  readonly createdAt: string;
}

// ─── Analytics projections (TKT-6.1.E4) ─────────────────────────────────

/**
 * Per-user public social statistics (the
 * `GET /social/users/:userId/stats` endpoint).
 *
 * The projection matches the SDK `UserSocialStatsResponseDto` shape
 * with consistent snake-case keys. The counts are public — the
 * endpoint is reachable for any user whose profile is public.
 */
export interface SocialUserStatsDto {
  readonly friends: number;
  readonly followers: number;
  readonly following: number;
}

/**
 * The viewer's own social analytics (the
 * `GET /social/me/analytics` endpoint).
 *
 * `growth30Days` is the net follower change over the rolling 30-day
 * window. The value is `0` when the viewer has no follow activity in
 * the window.
 */
export interface SocialMyAnalyticsDto {
  readonly friends: number;
  readonly followers: number;
  readonly following: number;
  readonly growth30Days: number;
}

/**
 * The leaderboard period discriminator. The SDK emits the same union
 * (`FriendLeaderboardDtoPeriod`) — the projection is a typed alias so
 * the rest of the UI can branch on the union without re-importing the
 * SDK enum.
 */
export type SocialFriendLeaderboardPeriod = "weekly" | "monthly" | "all_time";

/**
 * A single row in the friend leaderboard. The `rank` is the
 * 1-indexed position in the leaderboard the response is scoped to.
 */
export interface FriendLeaderboardEntryDto {
  readonly rank: number;
  readonly userId: string;
  readonly userName: string;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
  readonly xp: number;
  readonly friendSince: string;
}

/**
 * The full friend leaderboard payload. The endpoint is viewer-only
 * (the leaderboard is the viewer's friends).
 */
export interface SocialFriendLeaderboardDto {
  readonly period: SocialFriendLeaderboardPeriod;
  readonly entries: readonly FriendLeaderboardEntryDto[];
  readonly currentUserRank: number | null;
  readonly totalParticipants: number;
}

// ─── Mutation request bodies ─────────────────────────────────────────────

/**
 * Body of `POST /social/friend-requests/:id/respond`. `accept === true`
 * corresponds to the master plan's `'accept'` action; `accept === false`
 * to `'decline'`.
 */
export interface RespondFriendRequestDto {
  readonly action: "accept" | "decline";
}

/**
 * Body of `POST /social/block`. The backend accepts an optional reason;
 * the frontend always sends an empty body so the UI does not have to
 * collect the reason before blocking. Future Phase 6 work may surface a
 * reason picker (master plan Phase 6 Risk 49).
 */
export type BlockUserDto = Record<string, never>;

// ─── Pagination ──────────────────────────────────────────────────────────

/**
 * Pagination kind discriminator used by the DTO adapters and the
 * `useCursorPaginated` primitive. Both `'offset'` and `'cursor'` are
 * supported by the social surface.
 */
export type SocialPaginationKind = "offset" | "cursor";

/**
 * The pagination parameters every social list endpoint accepts. The
 * SDK normally encodes these via query parameters; the frontend
 * canonicalises them through the adapter layer.
 */
export interface SocialPaginationParams {
  readonly limit?: number;
  readonly cursor?: string;
  readonly offset?: number;
}

/**
 * Discriminated union returned by `normalizeSocialPage`.
 *
 * The `offset` variant carries `total`, `offset`, `limit`; the
 * `cursor` variant carries `nextCursor`. Consumers branch on
 * `paginationKind` and access the matching fields — TypeScript enforces
 * the discrimination at the call site.
 */
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

// ─── SWR cache-key factories ─────────────────────────────────────────────

/**
 * SWR cache-key factories consumed by every social read hook and every
 * mutation hook. Each factory returns a frozen tuple; equal inputs
 * produce equal keys.
 *
 * ## Invalidation
 *
 * After a successful social mutation, callers invalidate the affected
 * keys. The `all(userId)` factory returns the full invalidation set for
 * a single user (relationship, followers, following, friends, counts);
 * mutation hooks in later stories use `all()` plus the targeted
 * endpoints (e.g. `sentRequests`, `pendingRequests`).
 *
 * ## Domain segmentation
 *
 * Every key is prefixed with `'social'` so the SWR namespace stays
 * distinct from other features. The `'v1'` literal anchors the cache
 * schema — a future breaking change to the response shape can bump
 * the literal and invalidate all stale keys in one release.
 */
export const SOCIAL_CACHE_KEYS = {
  /** SWR key for the relationship status between viewer and target. */
  makeRelationshipKey(targetUserId: string) {
    return ["social", "v1", "relationship", targetUserId] as const;
  },

  /** SWR key for a user's followers list. */
  makeFollowersKey(userId: string) {
    return ["social", "v1", "followers", userId] as const;
  },

  /** SWR key for a user's following list. */
  makeFollowingKey(userId: string) {
    return ["social", "v1", "following", userId] as const;
  },

  /** SWR key for a user's friends list. */
  makeFriendsKey(userId: string) {
    return ["social", "v1", "friends", userId] as const;
  },

  /** SWR key for the viewer's blocked-users list (viewer-only). */
  makeBlockedKey() {
    return ["social", "v1", "blocked"] as const;
  },

  /** SWR key for the viewer's incoming friend requests (viewer-only). */
  makeIncomingRequestsKey() {
    return ["social", "v1", "requests", "incoming"] as const;
  },

  /** SWR key for the viewer's outgoing friend requests (viewer-only). */
  makeOutgoingRequestsKey() {
    return ["social", "v1", "requests", "outgoing"] as const;
  },

  /** SWR key for the discovery suggestions feed (viewer-only). */
  makeSuggestionsKey() {
    return ["social", "v1", "suggestions"] as const;
  },

  /** SWR key for the search suggestions list (viewer-only). */
  makeSearchSuggestionsKey() {
    return ["social", "v1", "search-suggestions"] as const;
  },

  /** SWR key for a user-search results page (viewer-only). */
  makeUserSearchKey(query: string, pageKey: string) {
    return ["social", "v1", "user-search", query, pageKey] as const;
  },

  /** SWR key for the trending-users list (viewer-only). */
  makeTrendingUsersKey() {
    return ["social", "v1", "trending"] as const;
  },

  /** SWR key for the mutual-friends list between viewer and target. */
  makeMutualFriendsKey(targetUserId: string) {
    return ["social", "v1", "mutual-friends", targetUserId] as const;
  },

  /** SWR key for the mutual-followers list between viewer and target. */
  makeMutualFollowersKey(targetUserId: string) {
    return ["social", "v1", "mutual-followers", targetUserId] as const;
  },

  /** SWR key for a target user's activity feed. */
  makeUserActivityKey(userId: string) {
    return ["social", "v1", "user-activity", userId] as const;
  },

  /** SWR key for the social counts of a user. */
  makeSocialCountsKey(userId: string) {
    return ["social", "v1", "counts", userId] as const;
  },

  /** SWR key for the social stats of a user (deep counters). */
  makeUserSocialStatsKey(userId: string) {
    return ["social", "v1", "user-stats", userId] as const;
  },

  /** SWR key for the viewer's own social analytics. */
  makeMySocialAnalyticsKey() {
    return ["social", "v1", "my-analytics"] as const;
  },

  /** SWR key for the friend leaderboard (viewer-only). */
  makeFriendLeaderboardKey(period: "daily" | "weekly" | "monthly" | "all_time") {
    return ["social", "v1", "friend-leaderboard", period] as const;
  },

  /** SWR key for the viewer's social feed. */
  makeFeedKey(viewerUserId: string) {
    return ["social", "v1", "feed", viewerUserId] as const;
  },
} as const;

/**
 * Type helper for `SOCIAL_CACHE_KEYS` — useful for downstream typing.
 */
export type SocialCacheKeyFactory = keyof typeof SOCIAL_CACHE_KEYS;