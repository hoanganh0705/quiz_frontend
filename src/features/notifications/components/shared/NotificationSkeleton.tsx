"use client";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/shared/utils/merge-class-names";

interface NotificationItemSkeletonProps {
className?: string;
}
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
<Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-full shrink-0 mt-0.5" />
<div className="flex-1 min-w-0 space-y-1.5">
<Skeleton className="h-3 w-2/3" />
<Skeleton className="h-3 w-full" />
<Skeleton className="h-3 w-4/5" />
</div>

<Skeleton className="h-3 w-10 shrink-0 mt-1" />
</div>
  );
}

interface NotificationListSkeletonProps {
count?: number;
className?: string;
}

export function NotificationListSkeleton({
count = 5,
className,
}: NotificationListSkeletonProps) {
return (
<div className={className} data-testid="notification-list-skeleton">
{Array.from({ length: count }).map((_, i) => (
<NotificationItemSkeleton key={i} />
      ))}
</div>
  );
}
