/**
 * Notifications types — Story 5.4 barrel.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.A1.
 *
 * Re-exports the public surface of the notifications types module so
 * consumers can import from a stable path without reaching into
 * `./notification.types` directly.
 *
 * Mirrors the `@/features/tournaments/types` barrel convention.
 */

export {
  DEFAULT_NOTIFICATION_LIST_FILTERS,
  NOTIFICATION_CACHE_KEYS,
  serializeNotificationFilters,
} from "./notification.types";

export type {
  DeleteNotificationMutationResult,
  MarkAllReadMutationResult,
  Notification,
  NotificationChannel,
  NotificationErrorCode,
  NotificationListFilters,
  NotificationListPage,
  NotificationMutationState,
  NotificationPreferences,
  NotificationPriority,
  NotificationReadMutationResult,
  NotificationType,
  UnreadCount,
} from "./notification.types";
