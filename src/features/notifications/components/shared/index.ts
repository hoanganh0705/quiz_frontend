/**
 * Notification shared primitives — barrel.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.C1, TKT-5.4.C2.
 *
 * Re-exports the loading / empty / error / connection-status primitives
 * consumed by `NotificationBell`, `NotificationPopover`,
 * `NotificationItem`, `NotificationCenterPage`, and
 * `NotificationPreferencesForm`.
 */

export {
  NotificationItemSkeleton,
  NotificationListSkeleton,
} from "./NotificationSkeleton";

export {
  NotificationEmptyState,
  type NotificationEmptyStateVariant,
} from "./NotificationEmptyState";

export { NotificationErrorState } from "./NotificationErrorState";

export { NotificationConnectionStatus } from "./NotificationConnectionStatus";
export type { NotificationConnectionStatusProps } from "./NotificationConnectionStatus";
