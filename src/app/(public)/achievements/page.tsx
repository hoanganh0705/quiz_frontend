/**
 * `/achievements` — Story 5.5 achievement surfaces route entry.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.F2 (route shell).
 *
 * Thin route entry that delegates to the `<AchievementsPage />` client
 * component. The route lives under `(public)` — auth gating is
 * enforced at the component level (`EarnedBadgeList` and
 * `AchievementHistory` return `null` for unauthenticated users; the
 * catalog is public).
 */

import { AchievementsPage } from "@/features/achievements/components/AchievementsPage";

export default function AchievementsRoute(): React.ReactElement {
  return <AchievementsPage />;
}