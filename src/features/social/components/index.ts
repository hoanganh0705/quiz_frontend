/**
 * Social feature components barrel.
 *
 * Re-exports social components from Epic 6.1 / 6.2 / 6.3 / 6.4 / 6.5
 * and Epic 6.6 (Batches E and F). Consumers import through this barrel
 * so the internal file layout can evolve without touching every consumer.
 *
 * Epic 6.6 additions:
 *   - `FollowButton`          (TKT-6.6.E1)
 *   - `FollowPendingIndicator` (TKT-6.6.E2)
 *   - `UnfollowConfirmDialog`  (TKT-6.6.E3)
 *   - `FollowErrorBanner`      (TKT-6.6.E4)
 *   - `FollowOptimisticLayer`  (TKT-6.6.E5)
 *   - `CONFIRM_DIALOGS`        (TKT-6.6.F1)
 *
 * Epic 6.7 additions (Batches E and F):
 *   - `BlockButton`             (TKT-6.7.E1)
 *   - `BlockConfirmDialog`      (TKT-6.7.E1)
 *   - `UnblockConfirmDialog`    (TKT-6.7.E1)
 *   - `BlockErrorBanner`        (TKT-6.7.E1)
 *   - `BLOCK_ERROR_COPY` helpers (TKT-6.7.F2)
 */

// Epic 6.6 / TKT-6.6.E1 — primary follow / unfollow CTA
export { FollowButton } from "./FollowButton";
export type { FollowButtonProps } from "./FollowButton";

// Epic 6.6 / TKT-6.6.E2 — pending state indicator for follow / unfollow
export { FollowPendingIndicator } from "./FollowPendingIndicator";
export type { FollowPendingIndicatorProps } from "./FollowPendingIndicator";

// Epic 6.6 / TKT-6.6.E3 — unfollow confirmation dialog (Radix AlertDialog)
export { UnfollowConfirmDialog } from "./UnfollowConfirmDialog";
export type { UnfollowConfirmDialogProps } from "./UnfollowConfirmDialog";

// Epic 6.6 / TKT-6.6.E4 — error banner with code-specific messages and retry
export { FollowErrorBanner } from "./FollowErrorBanner";
export type { FollowErrorBannerProps } from "./FollowErrorBanner";

// Epic 6.6 / TKT-6.6.E4 — follow error copy utilities (re-exported for consumers)
export {
  getFollowErrorCopy,
  isFollowErrorRetryable,
  getFollowErrorMessage,
} from "./follow-error-copy";
export type { FollowErrorCode } from "./follow-error-copy";

// Epic 6.6 / TKT-6.6.E5 — optimistic UI display layer
export { FollowOptimisticLayer } from "./FollowOptimisticLayer";
export type { FollowOptimisticLayerProps } from "./FollowOptimisticLayer";

// Epic 6.6 / TKT-6.6.F1 — confirm-dialog vocabulary
export {
  CONFIRM_DIALOGS,
  getConfirmDialogCopy,
} from "./confirm-dialog-vocabulary";
export type {
  DialogVocabulary,
  ConfirmDialogAction,
} from "./confirm-dialog-vocabulary";

// Epic 6.7 / TKT-6.7.E1 — primary block / unblock CTA
export { BlockButton } from "./BlockButton";
export type { BlockButtonProps } from "./BlockButton";

// Epic 6.7 / TKT-6.7.E1 — block confirmation dialog (Radix AlertDialog)
export { BlockConfirmDialog } from "./BlockConfirmDialog";
export type { BlockConfirmDialogProps } from "./BlockConfirmDialog";

// Epic 6.7 / TKT-6.7.E1 — unblock confirmation dialog (Radix AlertDialog)
export { UnblockConfirmDialog } from "./UnblockConfirmDialog";
export type { UnblockConfirmDialogProps } from "./UnblockConfirmDialog";

// Epic 6.7 / TKT-6.7.E1 — block / unblock error banner with code-specific copy
export { BlockErrorBanner } from "./BlockErrorBanner";
export type { BlockErrorBannerProps } from "./BlockErrorBanner";

// Epic 6.7 / TKT-6.7.F2 — block error copy utilities (re-exported for consumers)
export {
  getBlockErrorCopy,
  getBlockErrorCopyString,
  isBlockErrorRetryable,
  getBlockErrorMessage,
} from "./block-error-copy";
export type { BlockErrorCode } from "./block-error-copy";

// Epic 6.8 / TKT-6.8.F1 + E1 — friend-request state machine.
export {
  FRIEND_REQUEST_CTA_TESTIDS,
  resolveFriendRequestUiState,
} from "./friend-request-state-machine";
export type {
  FriendRequestActionKind,
  FriendRequestCtaIcon,
  FriendRequestHookState,
  FriendRequestUiState,
  ResolveFriendRequestUiStateArgs,
} from "./friend-request-state-machine";

// Epic 6.8 / TKT-6.8.F2 — extends the confirm-dialog vocabulary with
// `unfriend` (previously scaffolded) and `cancel_friend_request`
// (previously scaffolded).
//
// (The vocabulary is already re-exported above via the
// Epic 6.6 / TKT-6.6.F1 entry — no new exports are required.

// Epic 6.8 / TKT-6.8.H1 — client-side route gate for the
// incoming / outgoing friend-request list routes.
export { FriendRequestRouteGate } from "./FriendRequestRouteGate";
export type {
  FriendRequestRouteKind,
} from "./FriendRequestRouteGate";

// Epic 6.8 / TKT-6.8.F3 — friend-request error copy registry.
export {
  FRIEND_REQUEST_ERROR_COPY,
  getFriendRequestErrorCopy,
  getFriendRequestErrorTitle,
  getFriendRequestErrorDescription,
  isFriendRequestErrorRetryable,
} from "./friend-request-error-copy";
export type {
  FriendRequestErrorCode,
  FriendRequestErrorCopy,
} from "./friend-request-error-copy";

// Epic 6.8 / TKT-6.8.E2 — primary friend-request CTA.
export { FriendRequestCta } from "./FriendRequestCta";
export type { FriendRequestCtaProps } from "./FriendRequestCta";

// Epic 6.8 / TKT-6.8.E3 — respond-actions popover + cancel dialog.
export { FriendRequestRespondActions } from "./FriendRequestRespondActions";
export type {
  FriendRequestRespondActionsProps,
} from "./FriendRequestRespondActions";

export { FriendRequestCancelDialog } from "./FriendRequestCancelDialog";
export type {
  FriendRequestCancelDialogProps,
} from "./FriendRequestCancelDialog";

// Epic 6.8 / TKT-6.8.E4 — unfriend confirm dialog.
export { UnfriendConfirmDialog } from "./UnfriendConfirmDialog";
export type {
  UnfriendConfirmDialogProps,
} from "./UnfriendConfirmDialog";

// Epic 6.8 / TKT-6.8.E7–E9 — shared list row, skeleton, and empty state.
export { FriendRequestItem } from "./FriendRequestItem";
export type {
  FriendRequestItemProps,
  FriendRequestItemActionContext,
} from "./FriendRequestItem";

export { FriendRequestSkeleton } from "./FriendRequestSkeleton";
export type {
  FriendRequestSkeletonProps,
} from "./FriendRequestSkeleton";

export { FriendRequestEmptyState } from "./FriendRequestEmptyState";
export type {
  FriendRequestEmptyStateProps,
  FriendRequestEmptyStateKind,
} from "./FriendRequestEmptyState";

// Epic 6.8 / TKT-6.8.E10 — friend-request error banner.
export { FriendRequestErrorBanner } from "./FriendRequestErrorBanner";
export type {
  FriendRequestErrorBannerProps,
} from "./FriendRequestErrorBanner";

// Epic 6.8 / TKT-6.8.E5 + E6 — list pages for incoming / outgoing
// requests.
export { IncomingRequestsListPage } from "./../pages/IncomingRequestsListPage";
export type {
  IncomingRequestsListPageProps,
} from "./../pages/IncomingRequestsListPage";

export { OutgoingRequestsListPage } from "./../pages/OutgoingRequestsListPage";
export type {
  OutgoingRequestsListPageProps,
} from "./../pages/OutgoingRequestsListPage";

// Epic 6.9 / TKT-6.9.E1 — type-discriminated feed-item dispatcher.
export { FeedItemRenderer } from "./FeedItemRenderer";
export type { FeedItemRendererProps } from "./FeedItemRenderer";
export { FEED_ITEM_RENDERER_INVARIANTS } from "./FeedItemRenderer";

// Epic 6.9 / TKT-6.9.E2 — per-type feed item sub-renderers.
export * as FeedItem from "./feed-item";

// Epic 6.9 / TKT-6.9.E3 — shared feed row primitive.
export { SocialFeedItem } from "./SocialFeedItem";
export type { SocialFeedItemProps } from "./SocialFeedItem";

// Epic 6.9 / TKT-6.9.F1 — feed-loading skeleton primitive.
export { FeedSkeleton } from "./FeedSkeleton";
export type { FeedSkeletonProps } from "./FeedSkeleton";

// Epic 6.9 / TKT-6.9.F2 — feed empty-state primitive.
export { FeedEmptyState } from "./FeedEmptyState";
export type { FeedEmptyStateProps } from "./FeedEmptyState";

// Epic 6.9 / TKT-6.9.F3 — feed error-state primitive.
export { FeedErrorState } from "./FeedErrorState";
export type { FeedErrorStateProps } from "./FeedErrorState";

// Epic 6.9 / TKT-6.9.F4 — feed revalidation indicator primitive.
export { FeedStaleMarker } from "./FeedStaleMarker";
export type { FeedStaleMarkerProps } from "./FeedStaleMarker";

// Epic 6.9 / TKT-6.9.F5 — "global feed" labelling component.
export { FeedGlobalNotice } from "./FeedGlobalNotice";

// Epic 6.9 / TKT-6.9.F6 — feed load-more affordance primitive.
export { FeedLoadMore } from "./FeedLoadMore";
export type { FeedLoadMoreProps } from "./FeedLoadMore";

// Epic 6.9 / TKT-6.9.G1 — global-feed route gate + placeholder.
export { SocialFeedRouteGate } from "./SocialFeedRouteGate";
export { SocialFeedPlaceholder } from "./SocialFeedPlaceholder";
export { SocialFeedPage } from "./../pages/SocialFeedPage";

// Epic 6.10 / TKT-6.10.E8 — side-effect-only shell that mounts the
// social-aware badge listeners (notification router + unread count).
export { BadgeSyncLayer } from "./BadgeSyncLayer";

// Epic 6.10 / TKT-6.10.E9 — small inline pill that surfaces the
// current `/notifications` socket connection state.
export {
  ConnectionStatusBadge,
  STATUS_COPY,
  shouldRenderStatusBadge,
} from "./ConnectionStatusBadge";
export type { ConnectionStatusBadgeCopy } from "./ConnectionStatusBadge";

// Epic 6.10 / TKT-6.10.F1 — inline toast for the most recent WS error.
export { RealtimeWsErrorToast } from "./RealtimeWsErrorToast";

// Epic 6.10 / TKT-6.10.G1 — integration shell that wires every social
// realtime listener hook and UI primitive into a single provider tree.
export { RealtimeSocialShell } from "./RealtimeSocialShell";
export type { RealtimeSocialShellProps } from "./RealtimeSocialShell";
