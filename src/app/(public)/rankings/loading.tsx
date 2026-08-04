/**
 * `/rankings` — Story 5.5 route-level skeleton.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.F1.
 *
 * Mirrors the outer dimensions of `<RankingsPage />`:
 *
 *   - Page chrome (`max-w-4xl`, `p-4 sm:p-6 lg:p-8`, header rows).
 *   - Summary card skeleton (TKT-5.5.D1).
 *   - Milestones skeleton (TKT-5.5.D2).
 *   - Leaderboard skeleton (10 rows, TKT-5.5.D1).
 *   - History skeleton (6 rows, TKT-5.5.D1).
 *
 * The route-skeleton-to-live swap is CLS-zero because every outer
 * dimension matches the live surface at every breakpoint.
 */

import { Skeleton } from "@/components/ui/Skeleton";
import {
  RankingSummarySkeleton,
  MilestonesListSkeleton,
  LeaderboardTableSkeleton,
  RankingHistorySkeleton,
} from "@/features/rankings/components";

export default function RankingsLoading() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="space-y-1">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </header>
      <RankingSummarySkeleton />
      <MilestonesListSkeleton />
      <LeaderboardTableSkeleton />
      <RankingHistorySkeleton />
    </main>
  );
}