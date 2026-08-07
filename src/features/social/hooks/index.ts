export { useRelationship } from "./useRelationship";
export type {
  UseRelationshipResult,
  UseRelationshipErrorCode,
  UseRelationshipOptions,
} from "./useRelationship";

export { useSocialPermissions, resolveSocialPermissions } from "./useSocialPermissions";
export type {
  UseSocialPermissionsResult,
  UseSocialPermissionsOptions,
} from "./useSocialPermissions";

export { useFollowers } from "./useFollowers";
export type { UseFollowersResult } from "./useFollowers";

export { useFollowing } from "./useFollowing";
export type { UseFollowingResult } from "./useFollowing";

export { useFriends } from "./useFriends";
export type { UseFriendsResult } from "./useFriends";

export { useBlockedUsers } from "./useBlockedUsers";
export type { UseBlockedUsersResult } from "./useBlockedUsers";

export { useSocialCounts } from "./useSocialCounts";
export type { UseSocialCountsResult, SocialCountsErrorCode } from "./useSocialCounts";

export { useIncomingRequests } from "./useIncomingRequests";
export type { UseIncomingRequestsResult } from "./useIncomingRequests";

export { useOutgoingRequests } from "./useOutgoingRequests";
export type { UseOutgoingRequestsResult } from "./useOutgoingRequests";

// Story 6.2 / TKT-6.2.B3 + B4 — URL state + lifecycle reset hooks
// for the social-graph list pages. These are the only Story 6.2
// additions to the hook barrel; the list page components themselves
// land in Batches E and F.
export { useSocialListUrlState } from "./useSocialListUrlState";
export type { UseSocialListUrlStateResult } from "./useSocialListUrlState";

export { useSocialListLifecycleReset } from "./useSocialListLifecycleReset";
export type { UseSocialListLifecycleResetOptions } from "./useSocialListLifecycleReset";

// Story 6.3 / TKT-6.3.B4 — URL-owned period state for the My
// Analytics page. Co-located with the Epic 6.2 URL state primitives
// so consumers can `import { usePeriodFilter } from "@/features/social"`
// rather than reaching into the file directly.
export { usePeriodFilter } from "./usePeriodFilter";
export type { UsePeriodFilterResult } from "./usePeriodFilter";

// Story 6.3 / TKT-6.3.B5 — extended lifecycle reset listener that
// also clears the `?period` URL state on logout. See the
// `useSocialLifecycleReset` doc-block for the contract.
export { useSocialLifecycleReset } from "./useSocialLifecycleReset";
export type { UseSocialLifecycleResetOptions } from "./useSocialLifecycleReset";

// Story 6.2 / TKT-6.2.D1 — SWR cache-key factory + shared config
// defaults for the four list pages.
export {
  makeSocialListSWRKey,
  useSocialListSWRKey,
  SOCIAL_LIST_SWR_DEFAULTS,
} from "./useSocialListSWRKey";
export type { SocialListSWRKey } from "./useSocialListSWRKey";

// Story 6.2 / TKT-6.2.D2 — privacy selector for the friends /
// blocked / counts surfaces.
export {
  useSocialListVisibility,
  resolveSocialListVisibility,
} from "./useSocialListVisibility";
export type { UseSocialListVisibilityResult } from "./useSocialListVisibility";

// Story 6.2 / TKT-6.2.D3 — counts-badge hook with broadcast-channel
// revalidation.
export { useSocialCountsBadge } from "./useSocialCountsBadge";
export type { UseSocialCountsBadgeResult } from "./useSocialCountsBadge";

// Story 6.3 / TKT-6.3.D1 — per-user social stats read hook with
// privacy-aware visibility mapping.
export { useUserSocialStats } from "./useUserSocialStats";
export type {
  UseUserSocialStatsResult,
  UserSocialStatsVisibility,
} from "./useUserSocialStats";

// Story 6.3 / TKT-6.3.D2 — viewer's deep analytics read hook with
// period-driven SWR key and eventual-consistency mapping.
export { useMySocialAnalytics } from "./useMySocialAnalytics";
export type { UseMySocialAnalyticsResult } from "./useMySocialAnalytics";

// Story 6.3 / TKT-6.3.D3 — friend leaderboard read hook with
// offset pagination and eventual-consistency mapping.
export { useFriendLeaderboard } from "./useFriendLeaderboard";
export type { UseFriendLeaderboardResult } from "./useFriendLeaderboard";

// Story 6.3 / TKT-6.3.D4 — the cross-cutting eventual-consistency
// SWR primitive. Re-exported so analytics pages can build on the
// same primitive directly without re-implementing the staleness
// derivation.
export {
  useEventuallyConsistentQuery,
  resolveStaleness,
} from "./useEventuallyConsistentQuery";
export type {
  UseEventuallyConsistentQueryResult,
  UseEventuallyConsistentQueryOptions,
  EventuallyConsistentEnvelope,
  StalenessSource,
} from "./useEventuallyConsistentQuery";

// Epic 6.6 / TKT-6.6.D1 + D2 — follow / unfollow mutation hooks.
export { useFollow } from "./useFollow";
export type { UseFollowResult } from "./useFollow";

export { useUnfollow } from "./useUnfollow";
export type { UseUnfollowResult, UnfollowErrorCode } from "./useUnfollow";

// Epic 6.7 / TKT-6.7.D1 + D2 — block / unblock mutation hooks.
export { useBlock } from "./useBlock";
export type { UseBlockResult, UseBlockInput, BlockErrorCode } from "./useBlock";

export { useUnblock } from "./useUnblock";
export type {
  UseUnblockResult,
  UnblockErrorCode,
} from "./useUnblock";

// Epic 6.8 / TKT-6.8.D1–D4 — friend-request mutation hooks.
export { useSendFriendRequest } from "./useSendFriendRequest";
export type {
  UseSendFriendRequestResult,
  SendFriendRequestErrorCode,
  UseSendFriendRequestOptions,
} from "./useSendFriendRequest";

export { useRespondFriendRequest } from "./useRespondFriendRequest";
export type {
  UseRespondFriendRequestResult,
  UseRespondFriendRequestInput,
  RespondFriendRequestErrorCode,
  UseRespondFriendRequestOptions,
} from "./useRespondFriendRequest";

export { useCancelFriendRequest } from "./useCancelFriendRequest";
export type {
  UseCancelFriendRequestResult,
  CancelFriendRequestErrorCode,
  UseCancelFriendRequestOptions,
} from "./useCancelFriendRequest";

export { useUnfriend } from "./useUnfriend";
export type {
  UseUnfriendResult,
  UnfriendErrorCode,
  UseUnfriendOptions,
} from "./useUnfriend";

// Epic 6.9 / TKT-6.9.D2 — the read hook for the global social
// feed surface. Mirrors the Epic 6.4 / TKT-6.4.D2 pattern: a
// feature-flag-gated, privacy-aware, offset-paginated read hook
// that consumes the verified service wrapper (`getFeed`,
// TKT-6.9.C1) via the offset-aware primitive (`useOffsetPaginated`,
// TKT-6.9.D1).
export { useFeed, resolveFeedVisibility } from "./useFeed";
export type { UseFeedResult } from "./useFeed";

// Epic 6.10 / TKT-6.10.E1 — relationship invalidation listener.
export { useRelationshipInvalidation } from "./useRelationshipInvalidation";

// Epic 6.10 / TKT-6.10.E2 — friend-request invalidation listener.
export { useFriendRequestInvalidation } from "./useFriendRequestInvalidation";

// Epic 6.10 / TKT-6.10.E3 — follow invalidation listener.
export { useFollowInvalidation } from "./useFollowInvalidation";

// Epic 6.10 / TKT-6.10.E4 — block invalidation listener.
export { useBlockInvalidation } from "./useBlockInvalidation";

// Epic 6.10 / TKT-6.10.E5 — social-feed invalidation listener.
export { useSocialFeedInvalidation } from "./useSocialFeedInvalidation";

// Epic 6.10 / TKT-6.10.E6 — notification-event router.
export { useNotificationEventRouter } from "./useNotificationEventRouter";

// Epic 6.10 / TKT-6.10.F2 — active-target registration hook.
export {
  useActiveTargetUserIds,
  getActiveTargetUserIds,
  __resetActiveTargetUserIdsForTests,
} from "./useActiveTargetUserIds";

// Epic 6.10 / TKT-6.10.F2 — post-reconnect re-hydration hook.
export { useReconnectReconciliation } from "./useReconnectReconciliation";
