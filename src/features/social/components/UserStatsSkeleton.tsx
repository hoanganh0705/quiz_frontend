"use client";

import { type ReactElement } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

const DEFAULT_TILE_COUNT = 4;

interface UserStatsSkeletonProps {

tileCount?: number;
}

export function UserStatsSkeleton({
tileCount = DEFAULT_TILE_COUNT,
}: UserStatsSkeletonProps = {}): ReactElement {
const tiles = Array.from({ length: tileCount });
return (
<div
role="status"
aria-busy="true"
aria-label="Loading user stats"
data-testid="user-stats-skeleton"
data-tile-count={tileCount}
className="flex flex-col gap-3 p-6"
    >
<div className="flex items-center gap-3">
<Skeleton className="size-10 rounded-full" />
<div className="flex flex-col gap-2 flex-1">
<Skeleton className="h-4 w-32" />
<Skeleton className="h-3 w-20" />
</div>
</div>
<div className="grid grid-cols-2 gap-2">
{tiles.map((_, i) => (
<div key={i} className="flex flex-col gap-1 p-2 rounded-md border border-border">
<Skeleton className="h-3 w-16" />
<Skeleton className="h-6 w-12" />
</div>
        ))}
</div>
</div>
  );
}