// Notifications feature - public API surface
//
// Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
// Source story:  5.4 — Live notification stream and notification center.
//
// Re-exports the public surface of the notifications feature so consumers
// can import from a stable path:
//   import { NotificationBell } from '@/features/notifications'
//
// Mirrors the `@/features/tournaments` barrel convention (Phase 5.2).
//
// Note: the legacy `NotificationDropdown` from Phase 3 is preserved at
// `@/features/notifications/components/NotificationDropdown` for the
// migration window. The new Phase 5 surfaces (NotificationBell,
// NotificationPopover, NotificationCenterPage, NotificationPreferencesPage,
// NotificationPlaceholder) are the canonical surfaces for new code.

export {
  NotificationItemSkeleton,
  NotificationListSkeleton,
  NotificationEmptyState,
  NotificationErrorState,
  NotificationConnectionStatus,
  UnreadBadge,
  NotificationItem,
  NotificationBell,
  NotificationPopover,
  NotificationPlaceholder,
  NotificationCenterPage,
  NotificationPreferencesPage,
  NotificationPreferencesForm,
  type NotificationEmptyStateVariant,
  type NotificationConnectionStatusProps,
  type UnreadBadgeProps,
  type NotificationItemProps,
  type NotificationBellProps,
  type NotificationPlaceholderProps,
  type NotificationCenterPageProps,
  type NotificationPreferencesPageProps,
  type NotificationPreferencesFormProps,
} from "./components";

// Hooks
export {
  useNotifications,
  useUnreadNotificationCount,
  useNotificationSocket,
  useNotificationFeatureFlag,
  useMarkNotificationRead,
  useMarkNotificationUnread,
  useDeleteNotification,
  useNotificationPreferences,
  type UseNotificationsResult,
  type UseUnreadNotificationCountResult,
  type UseNotificationSocketResult,
  type UseNotificationFeatureFlagResult,
  type UseMarkNotificationReadResult,
  type UseMarkNotificationUnreadResult,
  type UseDeleteNotificationResult,
  type UseNotificationPreferencesResult,
} from "./hooks";

// Types
export {
  NOTIFICATION_CACHE_KEYS,
  serializeNotificationFilters,
  DEFAULT_NOTIFICATION_LIST_FILTERS,
  type DeleteNotificationMutationResult,
  type MarkAllReadMutationResult,
  type Notification,
  type NotificationChannel,
  type NotificationErrorCode,
  type NotificationListFilters,
  type NotificationListPage,
  type NotificationMutationState,
  type NotificationPreferences,
  type NotificationPriority,
  type NotificationReadMutationResult,
  type NotificationType,
  type UnreadCount,
} from "./types";
