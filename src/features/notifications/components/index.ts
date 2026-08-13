/**
 * Notification components — Story 5.4 barrel.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.D1–D5 + TKT-5.4.C1–C2.
 *
 * Re-exports the public surface of the notifications components so
 * consumers can import from a stable path:
 *
 *   import { NotificationBell } from '@/features/notifications/components'
 *
 * The shared primitives (skeleton, empty state, error state, connection
 * status) are also re-exported from here so D-batch consumers have a
 * single import path.
 */

// ─── Shared primitives ────────────────────────────────────────────────────

export {
  NotificationItemSkeleton,
  NotificationListSkeleton,
  NotificationEmptyState,
  NotificationErrorState,
  type NotificationEmptyStateVariant,
} from "./shared";

// ─── Story 5.4 surfaces ──────────────────────────────────────────────────

export { UnreadBadge } from "./UnreadBadge";
export type { UnreadBadgeProps } from "./UnreadBadge";

export { NotificationItem } from "./NotificationItem";
export type { NotificationItemProps } from "./NotificationItem";

export { NotificationBell } from "./NotificationBell";
export type { NotificationBellProps } from "./NotificationBell";

export { NotificationPopover } from "./NotificationPopover";

export { NotificationPlaceholder } from "./NotificationPlaceholder";
export type { NotificationPlaceholderProps } from "./NotificationPlaceholder";

export { NotificationCenterPage } from "./NotificationCenterPage";
export type { NotificationCenterPageProps } from "./NotificationCenterPage";

export { NotificationPreferencesPage } from "./NotificationPreferencesPage";
export type {
  NotificationPreferencesPageProps,
} from "./NotificationPreferencesPage";

export { NotificationPreferencesForm } from "./NotificationPreferencesForm";
export type {
  NotificationPreferencesFormProps,
} from "./NotificationPreferencesForm";