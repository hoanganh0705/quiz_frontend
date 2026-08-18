"use client";

import { type ReactElement } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

const DEFAULT_ROW_COUNT = 5;

type SearchResultSkeletonKind = "suggestions" | "search" | "trending";

interface SearchResultSkeletonProps {

kind: SearchResultSkeletonKind;

rowCount?: number;
}

function renderRow(
kind: SearchResultSkeletonKind,
index: number,
): ReactElement {
if (kind === "trending") {
return (
<div key={index} className="flex items-center gap-3">
<Skeleton className="w-6 h-6 rounded text-xs font-mono text-center" />
<Skeleton className="size-8 rounded-full" />
<div className="flex flex-col gap-1 flex-1">
<Skeleton className="h-3 w-1/3" />
<Skeleton className="h-2 w-1/4" />
</div>
</div>
    );
  }
return (
<div key={index} className="flex items-center gap-3">
<Skeleton className="size-8 rounded-full" />
<div className="flex flex-col gap-1 flex-1">
<Skeleton className="h-3 w-1/3" />
<Skeleton className="h-2 w-1/4" />
</div>
</div>
  );
}

export function SearchResultSkeleton({
kind,
rowCount = DEFAULT_ROW_COUNT,
}: SearchResultSkeletonProps): ReactElement {
const rows = Array.from({ length: rowCount });
return (
<div
role="status"
aria-busy="true"
aria-label={`Loading ${kind} results`}
data-testid={"search-result-skeleton-" + kind}
data-row-count={rowCount}
className="flex flex-col gap-3 p-4"
    >
{rows.map((_, i) => renderRow(kind, i))}
</div>
  );
}
