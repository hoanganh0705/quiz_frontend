'use client';

/**
 * `app/admin/tournaments/page.tsx`
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.A3.
 *
 * ## Purpose
 *
 * Thin route file. Reserves the `/admin/tournaments` slot inside the
 * Epic 7.2 admin route group ahead of the Story 7.7 tournament-admin
 * surface landing. This file:
 *   1. Delegates rendering to `<TournamentAdminRouteHandoff />` from
 *      `./_components/TournamentAdminRouteHandoff`.
 *   2. Is protected by the Epic 7.2 outer shells:
 *      - `src/proxy.ts` (route-prefix `/admin/*` guard, see `ADMIN_PREFIXES`)
 *      - `AdminLayoutShell` in the parent `admin/layout.tsx`
 *      - `AdminFeatureFlagBoundary` (the `admin_live` parent gate)
 *      - `AdminRoleGuard` (client-side role re-check, Epic 7.1)
 *   3. Is additionally gated by `admin_tournament_live` (the per-area
 *      sub-flag) inside the handoff component.
 *
 * ## What this file does NOT do
 *
 * - Does NOT call `listTournaments`, `createTournament`, `updateTournament`,
 *   or `deleteTournament` directly.
 * - Does NOT manage any `useState` for tournaments, loading, or dialogs.
 * - Does NOT own any mutation logic.
 * - Does NOT use axios or fetch directly (the cross-batch
 *   `admin-no-axios-or-fetch` invariant from
 *   `scripts/admin-lint-invariants.mjs` enforces this).
 *
 * All state and mutations are owned by the components inside
 * `features/admin/tournament-admin/components/`, which will be
 * implemented in Batches C–F of Epic 7.7. The F2 ticket
 * (`TKT-7.7.F2`) will extend this handoff to delegate to
 * `<TournamentAdminPage />` once the page lands.
 */

import { TournamentAdminRouteHandoff } from './_components/TournamentAdminRouteHandoff';

export default function AdminTournamentsPage() {
  return <TournamentAdminRouteHandoff />;
}