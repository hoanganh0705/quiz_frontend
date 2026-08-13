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
 *   - renders the `UnreadBadge` overlay when notifications are live
 *   - is keyboard-accessible (Enter / Space open the popover via
 *     Radix DropdownMenuTrigger)
 *   - renders the bell in every mode, but suppresses the badge and the
 *     live popover when the `notifications_live` feature flag is
 *     `'placeholder'` (the bell itself never depends on the flag —
 *     only its affordances do)
 *
 * The popover is owned by Radix's `DropdownMenu`; the bell button is
 * its `DropdownMenuTrigger`. The bell itself is non-service — it only
 * imports the documented hooks.
 */

import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";

import { getFeatureFlagValue } from "@/lib/feature-flags";

import { UnreadBadge } from "./UnreadBadge";
import { NotificationPopover } from "./NotificationPopover";

export interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const flagValue = getFeatureFlagValue("notifications_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  // Best production behaviour: render the bell so the UI surface is
  // always present (and keyboard-accessible), but suppress the badge
  // and the live popover in placeholder mode.
  const suppressBadge = isFlagPlaceholder;

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
            {suppressBadge ? null : <UnreadBadge />}
          </button>
        </DropdownMenuTrigger>
        {suppressBadge ? null : <NotificationPopover />}
      </DropdownMenu>
    </div>
  );
}
