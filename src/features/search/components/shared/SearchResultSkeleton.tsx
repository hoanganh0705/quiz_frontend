"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/shared/utils/merge-class-names";

export const SEARCH_RESULT_KINDS = [
"quiz",
"user",
"tournament",
"achievement",
"ranking",
"tag",
"category",
"comment",
"social",
] as const;

function SkeletonRow({ className }: { className?: string }) {
return (
<div className={cn("flex items-center gap-3 py-2.5", className)}>
{/* Icon / avatar placeholder */}
<Skeleton className="h-8 w-8 rounded-full shrink-0" />
{/* Title + subtitle */}
<div className="flex-1 min-w-0 space-y-1.5">
<Skeleton className="h-4 w-3/4" />
<Skeleton className="h-3 w-1/2" />
</div>
{/* Navigation arrow placeholder */}
<Skeleton className="h-4 w-4 shrink-0" />
</div>
  );
}

interface SearchResultSkeletonProps {

count?: number;
className?: string;
}

export function SearchResultSkeleton({
count = 4,
className,
}: SearchResultSkeletonProps) {
return (
<div className={cn("space-y-6", className)}>
{SEARCH_RESULT_KINDS.map((kind) => (
<section key={kind} aria-busy="true" aria-label={`Loading ${kind} results`}>
{/* Group header skeleton */}
<div className="flex items-center gap-2 pb-2 mb-1">
<Skeleton className="h-4 w-20" />
<Skeleton className="h-3 w-8 rounded-full" />
</div>
{/* Divider */}
<div className="border-b mb-1" />
{/* Rows */}
<div>
{Array.from({ length: count }).map((_, i) => (
<SkeletonRow key={i} />
            ))}
</div>
</section>
      ))}
</div>
  );
}

interface SearchResultGroupSkeletonProps {

kind: string;

count?: number;
className?: string;
}

export function SearchResultGroupSkeleton({
kind,
count = 4,
className,
}: SearchResultGroupSkeletonProps) {
return (
<section
aria-busy="true"
aria-label={`Loading ${kind} results`}
className={cn("space-y-1", className)}
    >
{/* Group header skeleton */}
<div className="flex items-center gap-2 pb-2 mb-1">
<Skeleton className="h-4 w-24" />
<Skeleton className="h-3 w-8 rounded-full" />
</div>
{/* Divider */}
<div className="border-b mb-1" />
{/* Rows */}
<div>
{Array.from({ length: count }).map((_, i) => (
<SkeletonRow key={i} />
        ))}
</div>
</section>
  );
}

interface SearchResultGroupSkeletonProps {

kind: string;

count?: number;
className?: string;
}