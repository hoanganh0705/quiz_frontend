"use client";

import { useUnreadNotificationCount } from "@/features/notifications/hooks";
import { cn } from "@/shared/utils/merge-class-names";

export interface UnreadBadgeProps {

size?: "sm" | "md";

className?: string;

dot?: boolean;
}

const MAX_DISPLAY = 99;

export function UnreadBadge({
size = "sm",
className,
dot = false,
}: UnreadBadgeProps) {
const { unreadCount } = useUnreadNotificationCount();

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
