"use client";

/**
 * `NotificationSkeleton.tsx` — skeleton primitives for notification surfaces.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.C1.
 *
 * Provides the loading skeleton for a single notification row and the
 * pre-composed `NotificationListSkeleton` (5 rows by default) for the
 * popover / center list surfaces. Each skeleton renders deterministic
 * placeholder content matching the shape of `NotificationItem` so the
 * layout does not shift when real data arrives.
 *
 * No service, hook, or socket client is imported by this primitive.
 */

import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/shared/utils/merge-class-names";

// ─── Row skeleton ─────────────────────────────────────────────────────────

interface NotificationItemSkeletonProps {
  className?: string;
}

/**
 * Skeleton for a single notification row.
 *
 * Matches the shape of `NotificationItem`: icon placeholder, title bar,
 * body bar (two lines), and timestamp bar.
 */
export function NotificationItemSkeleton({
  className,
}: NotificationItemSkeletonProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100 dark:border-slate-800 last:border-b-0",
        className,
      )}
      data-testid="notification-item-skeleton"
    >
      {/* Icon placeholder */}
      <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-full shrink-0 mt-0.5" />

      {/* Title + body */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>

      {/* Timestamp placeholder */}
      <Skeleton className="h-3 w-10 shrink-0 mt-1" />
    </div>
  );
}

// ─── List skeleton ────────────────────────────────────────────────────────

interface NotificationListSkeletonProps {
  /** Number of skeleton rows to render. Defaults to 5 (matches the popover default). */
  count?: number;
  className?: string;
}

/**
 * Pre-composed skeleton for the notification list (popover / center).
 *
 * Renders `count` `NotificationItemSkeleton` rows so the layout matches
 * the real list once data arrives.
 */
export function NotificationListSkeleton({
  count = 5,
  className,
}: NotificationListSkeletonProps) {
  return (
    <div
      className={className}
      data-testid="notification-list-skeleton"
    >
      {Array.from({ length: count }).map((_, i) => (
        <NotificationItemSkeleton key={i} />
      ))}
    </div>
  );
}
