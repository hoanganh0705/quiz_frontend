"use client";

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
