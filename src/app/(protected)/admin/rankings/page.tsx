/**
 * `app/admin/rankings/page.tsx`
 *
 * Source epic:   Epic 7.9 — Ranking Admin: Recalculate, Consistency Check, Period Reset.
 * Source ticket: TKT-7.9.A3 (route reservation) + TKT-7.9.F2 (page wiring).
 *
 * ## Purpose
 *
 * Server-rendered page boundary for the `/admin/rankings` route.
 * Renders the `<RankingsAdminRouteHandoff />` client component which
 * gates the content on `admin_ranking_live` and `useAdminRole`,
 * then mounts `<RankingAdminPage />` (TKT-7.9.F1) when the flag is live.
 */

import { RankingsAdminRouteHandoff } from './_components/RankingsAdminRouteHandoff';

export default function AdminRankingsPage() {
  return <RankingsAdminRouteHandoff />;
}
