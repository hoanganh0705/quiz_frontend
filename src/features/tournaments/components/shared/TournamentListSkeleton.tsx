"use client";

/**
 * `TournamentListSkeleton` — pre-composed skeleton grid for tournament list page.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.2 — Tournament discovery and read-only detail surfaces.
 * Source ticket: TKT-5.2.C1.
 */

import { TournamentCardSkeleton } from "./TournamentSkeleton";

interface TournamentListSkeletonProps {
  /** Number of skeleton cards to render. Defaults to 8. */
  count?: number;
  className?: string;
}

export function TournamentListSkeleton({
  count = 8,
  className,
}: TournamentListSkeletonProps) {
  return (
    <div
      className={className}
      data-testid="tournament-list-skeleton"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <TournamentCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
