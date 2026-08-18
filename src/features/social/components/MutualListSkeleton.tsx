"use client";

import { type ReactElement } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

import { MUTUAL_LIST_PAGE_SIZE } from "@/features/social/mutual-count-invariants";

interface MutualListSkeletonProps {

rowCount?: number;
}

export function MutualListSkeleton({
rowCount = MUTUAL_LIST_PAGE_SIZE,
}: MutualListSkeletonProps = {}): ReactElement {
const rows = Array.from({ length: rowCount });
return (
<div
role="status"
aria-busy="true"
aria-label="Loading mutual list"
data-testid="mutual-list-skeleton"
data-row-count={rowCount}
className="flex flex-col gap-2 p-4"
    >
{rows.map((_, i) => (
<div key={i} className="flex items-center gap-3">
<Skeleton className="size-8 rounded-full" />
<Skeleton className="h-4 flex-1" />
</div>
      ))}
</div>
  );
}
