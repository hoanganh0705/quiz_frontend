"use client";

import { type ReactElement } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

import { SOCIAL_GRAPH_DEFAULT_LIMIT } from "@/features/social/pagination-invariants";

interface FriendLeaderboardSkeletonProps {

rowCount?: number;
}

export function FriendLeaderboardSkeleton({
rowCount = SOCIAL_GRAPH_DEFAULT_LIMIT,
}: FriendLeaderboardSkeletonProps = {}): ReactElement {
const rows = Array.from({ length: rowCount });
return (
<div
role="status"
aria-busy="true"
aria-label="Loading friend leaderboard"
data-testid="friend-leaderboard-skeleton"
data-row-count={rowCount}
className="flex flex-col gap-2 p-4"
    >
{rows.map((_, i) => (
<div key={i} className="flex items-center gap-3">
<Skeleton className="size-8 rounded-full" />
<Skeleton className="h-4 flex-1" />
<Skeleton className="h-4 w-12" />
</div>
      ))}
</div>
  );
}