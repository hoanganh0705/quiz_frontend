"use client";

import { type ReactElement } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

export interface FriendRequestSkeletonProps {

readonly count?: number;
}

export function FriendRequestSkeleton({
count = 5,
}: FriendRequestSkeletonProps = {}): ReactElement {
const rows = Array.from({ length: count });
return (
<div
role="status"
aria-busy="true"
aria-label="Loading friend requests"
data-testid="friend-request-skeleton"
data-row-count={count}
className="flex flex-col gap-2 p-4"
    >
{rows.map((_, i) => (
<div key={i} className="flex items-center gap-3">
<Skeleton className="size-8 rounded-full" />
<Skeleton className="h-4 flex-1" />
<Skeleton className="h-8 w-24" />
</div>
      ))}
</div>
  );
}
