/**
 * `/achievements` — Story 5.5 route-level skeleton.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.F2.
 *
 * Mirrors the outer dimensions of `<AchievementsPage />`:
 *
 *   - Page chrome (`max-w-4xl`, `p-4 sm:p-6 lg:p-8`, header rows).
 *   - Badge gallery skeleton (6 cards, TKT-5.5.D3).
 *   - Earned-badges skeleton (4 rows, TKT-5.5.D4).
 *   - Achievement history skeleton (6 rows, TKT-5.5.D4).
 */

import { Skeleton } from "@/components/ui/Skeleton";
import {
  BadgeGallerySkeleton,
  EarnedBadgeListSkeleton,
  AchievementHistorySkeleton,
} from "@/features/achievements/components";

export default function AchievementsLoading() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="space-y-1">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-80" />
      </header>
      <BadgeGallerySkeleton />
      <EarnedBadgeListSkeleton />
      <AchievementHistorySkeleton />
    </main>
  );
}