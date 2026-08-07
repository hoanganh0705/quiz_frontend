/**
 * `feed-item/` — Per-type feed item sub-renderers and the
 * defensive `FeedItemUnknown` fallback.
 *
 * Source epic:   Epic 6.9 — Global Social Feed.
 * Source story:  Story 6.9.
 * Source ticket: TKT-6.9.E2.
 *
 * Each sub-renderer is a presentational component that renders
 * the type-specific copy for a single feed item. The dispatcher
 * (`FeedItemRenderer`, TKT-6.9.E1) routes a `SocialFeedItemDto`
 * to the matching sub-renderer based on the item's `type`
 * discriminator.
 *
 * The five phase-plan-only sub-renderers (`FeedItemQuizPublished`,
 * `FeedItemAttemptCompleted`, `FeedItemAchievementEarned`,
 * `FeedItemFollowReceived`, `FeedItemFriendRequestAccepted`) are
 * exported for plan-completeness but the dispatcher does not
 * include a dispatcher arm for them today — the discriminators
 * are not in the current SDK enum, so adding them would be a
 * TypeScript error. When the backend adds one of these literals
 * to the SDK, follow the migration steps in the corresponding
 * sub-renderer's JSDoc.
 */

export { FeedItemBadgeEarned } from "./FeedItemBadgeEarned";
export type { FeedItemBadgeEarnedProps } from "./FeedItemBadgeEarned";

export { FeedItemBadgeRevoked } from "./FeedItemBadgeRevoked";
export type { FeedItemBadgeRevokedProps } from "./FeedItemBadgeRevoked";

export { FeedItemRankMilestone } from "./FeedItemRankMilestone";
export type { FeedItemRankMilestoneProps } from "./FeedItemRankMilestone";

export { FeedItemPeakRankAchieved } from "./FeedItemPeakRankAchieved";
export type {
  FeedItemPeakRankAchievedProps,
} from "./FeedItemPeakRankAchieved";

export { FeedItemTournamentJoined } from "./FeedItemTournamentJoined";
export type { FeedItemTournamentJoinedProps } from "./FeedItemTournamentJoined";

export { FeedItemTournamentCompleted } from "./FeedItemTournamentCompleted";
export type {
  FeedItemTournamentCompletedProps,
} from "./FeedItemTournamentCompleted";

export { FeedItemTournamentWon } from "./FeedItemTournamentWon";
export type { FeedItemTournamentWonProps } from "./FeedItemTournamentWon";

export { FeedItemCommentCreated } from "./FeedItemCommentCreated";
export type { FeedItemCommentCreatedProps } from "./FeedItemCommentCreated";

export { FeedItemQuizCompleted } from "./FeedItemQuizCompleted";
export type { FeedItemQuizCompletedProps } from "./FeedItemQuizCompleted";

export { FeedItemQuizMilestone } from "./FeedItemQuizMilestone";
export type { FeedItemQuizMilestoneProps } from "./FeedItemQuizMilestone";

export { FeedItemInstanceCreated } from "./FeedItemInstanceCreated";
export type { FeedItemInstanceCreatedProps } from "./FeedItemInstanceCreated";

export { FeedItemInstanceJoined } from "./FeedItemInstanceJoined";
export type { FeedItemInstanceJoinedProps } from "./FeedItemInstanceJoined";

export { FeedItemInstanceCompleted } from "./FeedItemInstanceCompleted";
export type {
  FeedItemInstanceCompletedProps,
} from "./FeedItemInstanceCompleted";

export { FeedItemQuizPublished } from "./FeedItemQuizPublished";
export type { FeedItemQuizPublishedProps } from "./FeedItemQuizPublished";

export { FeedItemAttemptCompleted } from "./FeedItemAttemptCompleted";
export type { FeedItemAttemptCompletedProps } from "./FeedItemAttemptCompleted";

export { FeedItemAchievementEarned } from "./FeedItemAchievementEarned";
export type {
  FeedItemAchievementEarnedProps,
} from "./FeedItemAchievementEarned";

export { FeedItemFollowReceived } from "./FeedItemFollowReceived";
export type { FeedItemFollowReceivedProps } from "./FeedItemFollowReceived";

export { FeedItemFriendRequestAccepted } from "./FeedItemFriendRequestAccepted";
export type {
  FeedItemFriendRequestAcceptedProps,
} from "./FeedItemFriendRequestAccepted";

export { FeedItemUnknown } from "./FeedItemUnknown";
export type { FeedItemUnknownProps } from "./FeedItemUnknown";