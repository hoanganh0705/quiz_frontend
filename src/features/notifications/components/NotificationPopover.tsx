"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
Check,
ChevronRight,
Loader2,
} from "lucide-react";
import { mutate as globalMutate } from "swr";

import {
DropdownMenuContent,
DropdownMenuGroup,
DropdownMenuLabel,
DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Button } from "@/components/ui/Button";

import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { markAllNotificationsRead } from "@/features/notifications/services/notifications.service";
import { ApiError, isApiError } from "@/lib/api";

import {
NOTIFICATION_CACHE_KEYS,
type NotificationListFilters,
} from "@/features/notifications/types/notification.types";

import { NotificationItem } from "./NotificationItem";
import {
NotificationEmptyState,
NotificationErrorState,
NotificationListSkeleton,
} from "./shared";

const DEFAULT_LIMIT = 5;
const POPOVER_FILTERS: NotificationListFilters = {
unreadOnly: false,
limit: DEFAULT_LIMIT,
};

export function NotificationPopover() {
const { items, isLoading, error, refresh, loadMore, hasMore } =
useNotifications(POPOVER_FILTERS);

const refreshedOnMountRef = useRef(false);
useEffect(() => {
if (refreshedOnMountRef.current) return;
refreshedOnMountRef.current = true;
void refresh();
  }, [refresh]);

const [markAllState, setMarkAllState] = useState<{
pending: boolean;
error: ApiError | null;
  }>({ pending: false, error: null });

const handleMarkAll = useCallback(async () => {
if (markAllState.pending) return;
setMarkAllState({ pending: true, error: null });
try {
await markAllNotificationsRead();

await Promise.all([
globalMutate(
(key) =>
Array.isArray(key) &&
key[0] === "notifications" &&
key[1] === "list",
undefined,
{ revalidate: true },
        ),
globalMutate(NOTIFICATION_CACHE_KEYS.unreadCount(), undefined, {
revalidate: true,
        }),
      ]);
setMarkAllState({ pending: false, error: null });
    } catch (cause: unknown) {
if (isApiError(cause)) {
setMarkAllState({ pending: false, error: cause });
      } else {
const mapped = new ApiError(
cause as unknown as ConstructorParameters<typeof ApiError>[0],
        );
setMarkAllState({ pending: false, error: mapped });
      }
    }
  }, [markAllState.pending]);

const headerSubtitle = useMemo(() => {
if (isLoading) return "Loading…";
if (error) return "Connection issue";
if (items.length === 0) return "You're all caught up";
return `${items.length} notification${items.length === 1 ? "" : "s"}`;
  }, [isLoading, error, items.length]);

const hasUnread = useMemo(
() => items.some((n) => !n.isRead),
[items],
  );

return (
<DropdownMenuContent
align="end"
className="w-[calc(100vw-2rem)] sm:w-80 md:w-96 p-0 max-w-md"
sideOffset={8}
data-testid="notification-popover"
    >
<div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border">
<div className="flex flex-col">
<DropdownMenuLabel className="p-0 text-sm sm:text-base font-semibold">
Notifications
          </DropdownMenuLabel>
<span className="text-[0.6rem] sm:text-[0.65rem] text-muted-foreground">
{headerSubtitle}
</span>
</div>
{hasUnread && (
<Button
variant="ghost"
size="sm"
className="h-7 px-2 text-[0.65rem] sm:text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
onClick={(e) => {
e.preventDefault();
e.stopPropagation();
void handleMarkAll();
            }}
disabled={markAllState.pending || isLoading}
aria-label="Mark all as read"
          >
{markAllState.pending ? (
<Loader2 className="h-3 w-3 animate-spin" />
            ) : (
<Check className="h-3 w-3 sm:mr-1" />
            )}
<span className="hidden xs:inline sm:inline">Mark all read</span>
<span className="inline xs:hidden sm:hidden">Mark read</span>
</Button>
        )}
</div>

<ScrollArea className="h-[60vh] sm:h-100 max-h-125">
<DropdownMenuGroup>
{isLoading ? (
<NotificationListSkeleton count={5} />
          ) : error ? (
<NotificationErrorState
error={error}
onRetry={() => void refresh()}
className="h-[60vh] sm:h-100"
            />
          ) : items.length === 0 ? (
<NotificationEmptyState
variant="unread"
className="h-[60vh] sm:h-100"
            />
          ) : (
<>
{items.map((notification) => (
<NotificationItem
key={notification.id}
notification={notification}
                />
              ))}
{hasMore && (
<div className="px-3 sm:px-4 py-2 border-b border-gray-100 dark:border-slate-800 last:border-b-0">
<Button
variant="ghost"
size="sm"
className="w-full text-[0.65rem] sm:text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400"
onClick={(e) => {
e.preventDefault();
e.stopPropagation();
loadMore();
                    }}
                  >
Load more
                  </Button>
</div>
              )}
</>
          )}
</DropdownMenuGroup>
</ScrollArea>

<DropdownMenuSeparator className="m-0" />
<div className="flex items-center justify-end px-3 sm:px-4 py-2">
<Link
href="/notifications"
className="inline-flex items-center gap-1 text-xs sm:text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
        >
View all
          <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
</Link>
</div>
</DropdownMenuContent>
  );
}
