"use client";

import { type ReactElement } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

import { FEED_DEFAULT_LIMIT } from "@/features/social/feed-pagination-invariants";

export interface FeedSkeletonProps {

readonly rowCount?: number;
}

export function FeedSkeleton({
rowCount = FEED_DEFAULT_LIMIT,
}: FeedSkeletonProps = {}): ReactElement {
const rows = Array.from({ length: rowCount });
return (
<div
role="status"
aria-busy="true"
aria-label="Loading feed"
data-testid="feed-skeleton"
data-row-count={rowCount}
className="flex flex-col gap-3 p-4"
    >
{rows.map((_, i) => (
<div
key={i}
className="flex items-start gap-3 p-2 rounded-md border border-border"
        >
<Skeleton className="size-10 rounded-full" />
<div className="flex flex-col gap-2 flex-1">
<Skeleton className="h-3 w-4/12" />
<Skeleton className="h-3 w-3/4" />
<Skeleton className="h-3 w-1/4" />
</div>
</div>
      ))}
</div>
  );
}