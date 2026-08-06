"use client";

/**
 * `UserStatsSkeleton` — Loading placeholder for the per-user Stats
 * card (`/social/users/:id/stats`).
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.C4.
 *
 * ## What this component owns
 *
 * A shimmer placeholder rendered by `UserStatsCard` (TKT-6.3.E3)
 * while the `useUserSocialStats` SWR load is in flight. The
 * skeleton mirrors the eventual layout of the Stats card
 * (a header row with a counts summary and a list of stat tiles).
 *
 * ## Accessibility
 *
 * `aria-busy="true"` on the root.
 */

import { type ReactElement } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

const DEFAULT_TILE_COUNT = 4;

interface UserStatsSkeletonProps {
  /** Number of stat tiles to render. Defaults to 4. */
  tileCount?: number;
}

export function UserStatsSkeleton({
  tileCount = DEFAULT_TILE_COUNT,
}: UserStatsSkeletonProps = {}): ReactElement {
  const tiles = Array.from({ length: tileCount });
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading user stats"
      data-testid="user-stats-skeleton"
      data-tile-count={tileCount}
      className="flex flex-col gap-3 p-6"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((_, i) => (
          <div key={i} className="flex flex-col gap-1 p-2 rounded-md border border-border">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}