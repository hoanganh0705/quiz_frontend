"use client";

/**
 * `NotificationBell.tsx` — bell icon button + popover trigger.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.D3.
 *
 * The bell is the primary notification entry point across all
 * authenticated pages. Clicking it toggles the `NotificationPopover`
 * open / closed. The bell:
 *
 *   - renders the `UnreadBadge` overlay
 *   - embeds a `NotificationConnectionStatus` next to the bell (visual
 *     cue for socket health)
 *   - is keyboard-accessible (Enter / Space open the popover via
 *     Radix DropdownMenuTrigger)
 *   - renders `null` when the `notifications_live` feature flag is
 *     `'placeholder'`
 *
 * The popover is owned by Radix's `DropdownMenu`; the bell button is
 * its `DropdownMenuTrigger`. The bell itself is non-service — it only
 * imports the documented hooks.
 */

import { useMemo } from "react";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";

import { useNotificationSocket } from "@/features/notifications/hooks/useNotificationSocket";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { UnreadBadge } from "./UnreadBadge";
import { NotificationConnectionStatus } from "./shared/NotificationConnectionStatus";
import { NotificationPopover } from "./NotificationPopover";

export interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const flagValue = getFeatureFlagValue("notifications_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  // Open the socket once per tab. The popover and the unread badge
  // both rely on the socket; mounting here keeps the surface cheap.
  const { connectionState, error } = useNotificationSocket();

  const hasError = useMemo(() => Boolean(error), [error]);

  if (isFlagPlaceholder) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-2 ${className ?? ""}`}
      data-testid="notification-bell"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Notifications"
            className="relative p-1.5 sm:p-2 border border-border rounded-md hover:bg-main-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Bell className="h-4 w-4 text-foreground" aria-hidden="true" />
            <UnreadBadge />
          </button>
        </DropdownMenuTrigger>
        <NotificationPopover />
      </DropdownMenu>

      <NotificationConnectionStatus
        connectionState={connectionState}
        hasError={hasError}
        showLabel={false}
        className="hidden sm:inline-flex"
        size="sm"
      />
    </div>
  );
}
