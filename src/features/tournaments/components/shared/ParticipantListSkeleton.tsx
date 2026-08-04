"use client";

/**
 * `ParticipantListSkeleton` — pre-composed skeleton rows for participants panel.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.2 — Tournament discovery and read-only detail surfaces.
 * Source ticket: TKT-5.2.C1.
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/shared/utils/merge-class-names";

interface ParticipantListSkeletonProps {
  /** Number of skeleton rows to render. Defaults to 10. */
  count?: number;
  className?: string;
}

export function ParticipantListSkeleton({
  count = 10,
  className,
}: ParticipantListSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)} data-testid="participant-list-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-lg border"
        >
          {/* Avatar skeleton */}
          <Skeleton className="h-10 w-10 rounded-full" />

          {/* Text content */}
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>

          {/* Status indicator */}
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
