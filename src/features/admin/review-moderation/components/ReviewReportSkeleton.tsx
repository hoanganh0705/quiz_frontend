'use client';

import { Skeleton } from '@/components/ui/Skeleton';

export interface ReviewReportSkeletonProps {

rows?: number;
}

export function ReviewReportSkeleton({
rows = 3,
}: ReviewReportSkeletonProps): React.ReactElement {
const count = Math.max(1, Math.floor(rows));

return (
<ul
role="status"
aria-busy="true"
aria-label="Loading review reports"
className="flex flex-col gap-2"
data-testid="review-report-skeleton-list"
    >
{Array.from({ length: count }, (_, index) => (
<li
key={index}
className="flex items-center gap-4 rounded-md border border-border bg-background px-4 py-3"
data-testid={`review-report-skeleton-row-${index}`}
        >
{/* Avatar placeholder */}
<Skeleton className="h-9 w-9 rounded-full" />

{/* Reason + status text placeholder */}
<div className="flex flex-1 flex-col gap-2">
<Skeleton className="h-4 w-1/3" />
<Skeleton className="h-3 w-1/2" />
</div>

{/* Status pill placeholder */}
<Skeleton className="h-5 w-20 rounded-full" />

{/* Action trigger placeholder */}
<Skeleton className="h-8 w-8 rounded-md" />
</li>
      ))}
</ul>
  );
}
