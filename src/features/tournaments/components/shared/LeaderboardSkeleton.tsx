"use client";

/**
 * `LeaderboardSkeleton` — pre-composed skeleton rows for leaderboard panel.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.2 — Tournament discovery and read-only detail surfaces.
 * Source ticket: TKT-5.2.C1.
 */

import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/shared/utils/merge-class-names";

interface LeaderboardSkeletonProps {
  /** Number of skeleton rows to render. Defaults to 10. */
  count?: number;
  className?: string;
}

export function LeaderboardSkeleton({
  count = 10,
  className,
}: LeaderboardSkeletonProps) {
  return (
    <div
      className={cn("space-y-3", className)}
      data-testid="leaderboard-skeleton"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-3 rounded-lg border"
        >
          {/* Rank + user info */}
          <div className="flex items-center gap-3">
            {/* Rank badge */}
            <Skeleton className="h-8 w-8 rounded-full" />

            {/* Avatar */}
            <Skeleton className="h-10 w-10 rounded-full" />

            {/* User name + score */}
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>

          {/* Score + attempts */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
