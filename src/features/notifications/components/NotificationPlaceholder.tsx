"use client";

/**
 * `NotificationPlaceholder.tsx` — safe fallback when feature flag is 'placeholder'.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.E1.
 *
 * Rendered by `NotificationCenterPage` and `NotificationPreferencesPage`
 * when the `phase5_notifications` feature flag is `'placeholder'`. The
 * placeholder contains no socket connection, no SWR fetches, and no
 * notification reads — it is a static surface only.
 */

import { Bell } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

export interface NotificationPlaceholderProps {
  /** Optional title override. */
  title?: string;
  /** Optional description override. */
  description?: string;
  /** Optional class name. */
  className?: string;
}

export function NotificationPlaceholder({
  title,
  description,
  className,
}: NotificationPlaceholderProps) {
  return (
    <EmptyState
      icon={Bell}
      title={title ?? "Notifications Coming Soon"}
      description={
        description ??
          "Notifications are currently under development. Check back soon for live updates, achievements, and tournament activity."
      }
      size="lg"
      className={className}
    />
  );
}