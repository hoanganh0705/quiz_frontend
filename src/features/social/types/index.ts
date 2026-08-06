/**
 * Social feature types barrel.
 *
 * Re-exports the type foundation declared in `relationship.ts`
 * (TKT-6.1.C1). Story 6.1 consumes the public surface through this
 * barrel so the internal file layout can evolve without touching
 * every consumer.
 */

export type {
  Relationship,
  SocialErrorCode,
  RelationshipStatusDto,
  SocialUserSummaryDto,
  SocialCountsDto,
  SocialBlockedUserDto,
  SocialSuggestionItemDto,
  SocialSuggestionReason,
  SocialFeedItemDto,
  SocialFeedItemType,
  SocialFeedItemPayload,
  SocialActivityItemDto,
  SocialMutualDto,
  SocialFriendRequestDto,
  RespondFriendRequestDto,
  BlockUserDto,
  SocialPaginationKind,
  SocialPaginationParams,
  SocialPage,
  SocialCacheKeyFactory,
} from "./relationship";

export {
  RELATIONSHIP_VALUES,
  SOCIAL_ERROR_CODES,
  SOCIAL_CACHE_KEYS,
  isSocialErrorCode,
  asErrorCode,
} from "./relationship";

// Story 6.3 / TKT-6.3.A3 — analytics period + kind union. Re-exported
// through the types barrel so callers can `import type { AnalyticsPeriod }
// from "@/features/social/types"` rather than reaching into the
// file directly. The runtime constants (`ANALYTICS_PERIOD_LABELS`,
// `ANALYTICS_KINDS`) are exported alongside the types for the same
// reason.
export type {
  AnalyticsPeriod,
  AnalyticsKind,
  SocialUserStatsDto,
  SocialMyAnalyticsDto,
  FriendLeaderboardEntryDto,
  FriendLeaderboardPeriod,
  FriendLeaderboardDto,
} from "./analytics";
export {
  ANALYTICS_PERIOD_LABELS,
  ANALYTICS_KINDS,
  FRIEND_LEADERBOARD_PERIODS,
  mapAnalyticsPeriodToLeaderboardPeriod,
} from "./analytics";