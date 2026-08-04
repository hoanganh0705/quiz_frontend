"use client";

/**
 * `UnreadBadge.tsx` — compact unread-count badge for the notification bell.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.D1.
 *
 * Renders the unread count from `useUnreadNotificationCount()`. The
 * badge:
 *
 *   - renders nothing when the count is 0
 *   - shows the exact count when 1..99
 *   - shows "99+" when ≥ 100
 *   - supports `aria-hidden` consumers should pair with the parent's
 *     accessible label (the `NotificationBell` adds `aria-label` to its
 *     trigger so screen readers announce the count separately)
 *
 * The badge is positioned absolutely relative to its parent bell icon.
 * It contains only the documented `useUnreadNotificationCount` hook
 * (plus React) — no service, socket, or other client.
 */

import { useUnreadNotificationCount } from "@/features/notifications/hooks";
import { cn } from "@/shared/utils/merge-class-names";

export interface UnreadBadgeProps {
  /** Visual size preset. `sm` is the bell default; `md` is for the popover footer. */
  size?: "sm" | "md";
  /** Optional className for the absolute-positioned wrapper. */
  className?: string;
  /** When `true`, the badge uses a dot-only style with no label. */
  dot?: boolean;
}

const MAX_DISPLAY = 99;

export function UnreadBadge({
  size = "sm",
  className,
  dot = false,
}: UnreadBadgeProps) {
  const { unreadCount } = useUnreadNotificationCount();

  // Falsy guard: nothing renders when count is 0.
  if (unreadCount <= 0) return null;

  const display =
    unreadCount > MAX_DISPLAY ? `${MAX_DISPLAY}+` : String(unreadCount);

  const sizeClass = {
    sm: "h-3 w-3 sm:h-4 sm:w-4 text-[0.6rem]",
    md: "h-5 w-5 text-xs",
  }[size];

  if (dot) {
    return (
      <span
        className={cn(
          "absolute -top-1 -right-1 rounded-full bg-red-600 dark:bg-white ring-2 ring-background",
          size === "sm" ? "h-2 w-2 sm:h-2.5 sm:w-2.5" : "h-3 w-3",
          className,
        )}
        aria-hidden="true"
        data-testid="unread-badge-dot"
      />
    );
  }

  return (
    <span
      className={cn(
        "absolute -top-1 -right-1 rounded-full dark:bg-white bg-red-600 text-white dark:text-black flex items-center justify-center font-semibold leading-none ring-1 ring-background",
        sizeClass,
        className,
      )}
      aria-hidden="true"
      data-testid="unread-badge"
      data-count={display}
    >
      <span aria-hidden="true">{display}</span>
    </span>
  );
}
