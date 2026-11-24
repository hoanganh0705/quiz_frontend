"use client";

import { Skeleton } from "@/components/ui/Skeleton";

export interface ReviewReportSkeletonProps {
  rows?: number;
}

export function ReviewReportSkeleton({
  rows = 4,
}: ReviewReportSkeletonProps): React.ReactElement {
  const count = Math.max(1, Math.floor(rows));

  return (
    <ul
      role="status"
      aria-busy="true"
      aria-label="Loading review reports"
      className="flex flex-col gap-2.5"
      data-testid="review-report-skeleton-list"
    >
      {Array.from({ length: count }, (_, index) => (
        <li
          key={index}
          className="flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm"
          data-testid={`review-report-skeleton-row-${index}`}
        >
          {/* Main content placeholders */}
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-3 w-12 rounded" />
              <Skeleton className="h-3.5 w-36 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-16 rounded" />
              <Skeleton className="h-3.5 w-24 rounded" />
            </div>
          </div>

          {/* Meta + Action placeholders */}
          <div className="flex items-center gap-3 shrink-0">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="hidden xl:block h-3.5 w-20 rounded font-mono" />
            <Skeleton className="size-9 rounded-lg" />
          </div>
        </li>
      ))}
    </ul>
  );
}
