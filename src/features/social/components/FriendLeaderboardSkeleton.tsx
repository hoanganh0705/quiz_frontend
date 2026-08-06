"use client";

/**
 * `FriendLeaderboardSkeleton` — Loading placeholder for the Friend
 * Leaderboard page (`/social/friends/leaderboard`).
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.C4.
 *
 * ## What this component owns
 *
 * A configurable-row-count shimmer placeholder rendered by
 * `FriendLeaderboardPage` (TKT-6.3.G2) while the `useFriendLeaderboard`
 * SWR load is in flight. The default row count mirrors
 * `SOCIAL_GRAPH_DEFAULT_LIMIT` (20) so the skeleton size matches the
 * eventual list length — a revalidation that loads 0 rows is
 * visually distinct from an initial load.
 *
 * ## Accessibility
 *
 * `aria-busy="true"` on the root.
 */

import { type ReactElement } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

import { SOCIAL_GRAPH_DEFAULT_LIMIT } from "@/features/social/pagination-invariants";

interface FriendLeaderboardSkeletonProps {
  /**
   * Number of leaderboard row placeholders to render. Defaults to
   * `SOCIAL_GRAPH_DEFAULT_LIMIT` (20).
   */
  rowCount?: number;
}

export function FriendLeaderboardSkeleton({
  rowCount = SOCIAL_GRAPH_DEFAULT_LIMIT,
}: FriendLeaderboardSkeletonProps = {}): ReactElement {
  const rows = Array.from({ length: rowCount });
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading friend leaderboard"
      data-testid="friend-leaderboard-skeleton"
      data-row-count={rowCount}
      className="flex flex-col gap-2 p-4"
    >
      {rows.map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}