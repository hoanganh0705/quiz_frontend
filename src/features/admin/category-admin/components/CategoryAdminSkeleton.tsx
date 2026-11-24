"use client";

import { Skeleton } from "@/components/ui/Skeleton";

export interface CategoryAdminSkeletonProps {
  tab: "active" | "deleted";
}

export function CategoryAdminSkeleton({ tab }: CategoryAdminSkeletonProps) {
  return (
    <div className="space-y-4">
      {/* Tab headers & Search toolbar skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex gap-1.5">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-full sm:w-64 rounded-md" />
      </div>

      {/* Category cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col justify-between h-full min-h-[148px] rounded-xl border border-border/80 bg-card p-4 shadow-2xs"
          >
            {/* Header: Name and Slug */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-5 w-28 rounded-md" />
                <Skeleton className="h-5 w-16 rounded font-mono shrink-0" />
              </div>
              <div className="space-y-1.5 py-1">
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-3/4 rounded" />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-border/40">
              <Skeleton className="h-3.5 w-20 rounded" />
              <div className="flex items-center gap-1.5">
                {tab === "deleted" ? (
                  <Skeleton className="h-8 w-20 rounded-md" />
                ) : (
                  <>
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
