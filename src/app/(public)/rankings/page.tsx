/**
 * `/rankings` — Story 5.5 ranking surfaces route entry.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.F1 (route shell).
 *
 * Thin route entry that delegates to the `<RankingsPage />` client
 * component. The route lives under `(public)` — auth gating is
 * enforced at the component level (`RankingSummaryCard`,
 * `RankingHistory`, and `MilestonesList` all return `null` for
 * unauthenticated users; the global leaderboard is public).
 */

import { RankingsPage } from "@/features/rankings/components/RankingsPage";

export default function RankingsRoute(): React.ReactElement {
  return <RankingsPage />;
}