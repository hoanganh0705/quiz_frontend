"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Settings } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { cn } from "@/shared/utils/merge-class-names";

import {
useNotifications,
useNotificationFeatureFlag,
useMarkAllNotificationsRead,
} from "@/features/notifications/hooks";

import {
NotificationItem,
NotificationListSkeleton,
NotificationEmptyState,
NotificationErrorState,
NotificationPlaceholder,
} from "@/features/notifications/components";

type FilterTab = "all" | "unread" | "read";

const PAGE_LIMIT = 10;

export interface NotificationCenterPageProps {
className?: string;
}

export function NotificationCenterPage({ className }: NotificationCenterPageProps) {
const { isPlaceholder } = useNotificationFeatureFlag();

if (isPlaceholder) {
return <NotificationPlaceholder className={className} />;
  }

return <NotificationCenterPageLive className={className} />;
}

function NotificationCenterPageLive({
className,
}: NotificationCenterPageProps) {
const [tab, setTab] = useState<FilterTab>("all");

const unreadOnly = tab === "unread" ? true : tab === "read" ? false : undefined;
const filters = useMemo(
() => ({ unreadOnly, limit: PAGE_LIMIT }),
[unreadOnly],
  );

const { items, isLoading, error, refresh, hasMore, loadMore } =
useNotifications(filters);

const refreshedOnMountRef = useRef(false);
useEffect(() => {
if (refreshedOnMountRef.current) return;
refreshedOnMountRef.current = true;
void refresh();
  }, [refresh]);

const visibleItems = useMemo(() => {
if (tab === "read") return items.filter((n) => n.isRead);
return items;
  }, [items, tab]);

const hasUnread = useMemo(
() => items.some((n) => !n.isRead),
[items],
  );

const { markAllRead, state: markAllState, error: markAllError } =
useMarkAllNotificationsRead();

const markAllCopy = markAllError
? "Retry mark all as read"
: "Mark all as read";

return (
<div
className={cn(
"min-h-screen bg-transparent text-foreground",
className,
      )}
data-testid="notification-center-page"
    >
<header className="px-4 sm:px-6 lg:px-8 pt-6 pb-4 max-w-4xl mx-auto">
<div className="flex flex-wrap items-start justify-between gap-3">
<div>
<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
Notifications
            </h1>
<p className="text-sm text-muted-foreground mt-1">
Stay updated on quiz invites, achievements, friend activity,
              and more.
            </p>
</div>
<div className="flex items-center gap-2">
<Button asChild variant="outline" size="sm">
<Link href="/notifications/preferences">
<Settings className="h-3.5 w-3.5 mr-1.5" />
Preferences
              </Link>
</Button>
{hasUnread && (
<Button
variant="default"
size="sm"
onClick={() => void markAllRead()}
disabled={markAllState === "pending" || isLoading}
aria-label="Mark all notifications as read"
              >
{markAllState === "pending" ? (
<Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
<Check className="h-3.5 w-3.5 mr-1.5" />
                )}
{markAllCopy}
</Button>
            )}
</div>
</div>

<Tabs
value={tab}
onValueChange={(value) => setTab(value as FilterTab)}
className="mt-4"
        >
<TabsList className="bg-muted/40">
<TabsTrigger value="all">All</TabsTrigger>
<TabsTrigger value="unread">Unread</TabsTrigger>
<TabsTrigger value="read">Read</TabsTrigger>
</TabsList>
</Tabs>

{markAllError && (
<div
className="mt-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-300"
role="alert"
data-testid="notification-mark-all-error"
          >
{markAllError.message}
</div>
        )}
</header>

<main className="px-4 sm:px-6 lg:px-8 pb-12 max-w-4xl mx-auto">
{isLoading ? (
<NotificationListSkeleton count={10} />
        ) : error ? (
<NotificationErrorState
error={error}
onRetry={() => void refresh()}
className="py-12"
          />
        ) : visibleItems.length === 0 ? (
<NotificationEmptyState variant="all" className="py-12" />
        ) : (
<>
<div className="rounded-lg border bg-card text-card-foreground overflow-hidden">
{visibleItems.map((notification) => (
<NotificationItem
key={notification.id}
notification={notification}
                />
              ))}
</div>

{hasMore && tab !== "read" && (
<div className="mt-4 flex justify-center">
<Button
variant="outline"
size="sm"
onClick={() => loadMore()}
aria-label="Load more notifications"
                >
Load more
                </Button>
</div>
            )}
</>
        )}
</main>
</div>
  );
}