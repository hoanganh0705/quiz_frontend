/**
 * Notifications hooks — Story 5.4 barrel.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.B (covered by B1–B7).
 *
 * Re-exports the public surface of the notifications hooks so consumers
 * can import from a stable path:
 *
 *   import { useNotifications } from '@/features/notifications/hooks'
 *
 * Mirrors the `@/features/tournaments/hooks` barrel convention.
 */

// ─── Reads ────────────────────────────────────────────────────────────────

export { useNotifications } from "./useNotifications";
export type { UseNotificationsResult } from "./useNotifications";

export { useUnreadNotificationCount } from "./useUnreadNotificationCount";
export type { UseUnreadNotificationCountResult } from "./useUnreadNotificationCount";

export { useNotificationSocket } from "./useNotificationSocket";
export type { UseNotificationSocketResult } from "./useNotificationSocket";

export { useNotificationFeatureFlag } from "./useNotificationFeatureFlag";
export type { UseNotificationFeatureFlagResult } from "./useNotificationFeatureFlag";

// ─── Mutations ───────────────────────────────────────────────────────────

export { useMarkNotificationRead } from "./useMarkNotificationRead";
export type { UseMarkNotificationReadResult } from "./useMarkNotificationRead";

export { useMarkNotificationUnread } from "./useMarkNotificationUnread";
export type { UseMarkNotificationUnreadResult } from "./useMarkNotificationUnread";

export { useDeleteNotification } from "./useDeleteNotification";
export type { UseDeleteNotificationResult } from "./useDeleteNotification";

export { useMarkAllNotificationsRead } from "./useMarkAllNotificationsRead";
export type { UseMarkAllNotificationsReadResult } from "./useMarkAllNotificationsRead";

export { useNotificationPreferences } from "./useNotificationPreferences";
export type { UseNotificationPreferencesResult } from "./useNotificationPreferences";
