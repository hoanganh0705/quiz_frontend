'use client';

/**
 * `features/admin/ranking-admin/components/RankingAdminPage.tsx`
 *
 * Source epic:   Epic 7.9 — Ranking Admin: Recalculate, Consistency Check, Period Reset.
 * Source ticket: TKT-7.9.F1.
 *
 * ## What this component owns
 *
 * The page-level composition that assembles `RecalculateRankingPanel`,
 * `PeriodResetPanel`, and `ConsistencyCheckPanel` into a single page
 * behind the `phase7_admin_ranking` feature flag and the
 * `ranking_manage` permission.
 *
 * ## Behaviour
 *
 * - When the flag is at its default value, renders the documented
 *   "Ranking admin coming soon" notice (mirroring the disabled-notice
 *   pattern from the route handoff).
 * - When the permission is pending, renders a `<Skeleton>` placeholder
 *   so the page does not flash empty controls.
 * - When the user lacks the permission, the page renders the layout
 *   but the panels' action buttons are gated by `usePermission` (the
 *   panels themselves do not show their buttons).
 */

import { useAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';
import { usePermission } from '@/features/admin/hooks/usePermission';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminPageHeader } from '@/app/admin/_components/AdminPageHeader';

import { ConsistencyCheckPanel } from './ConsistencyCheckPanel';
import { PeriodResetPanel } from './PeriodResetPanel';
import { RecalculateRankingPanel } from './RecalculateRankingPanel';

/**
 * Page-level composition behind the `phase7_admin_ranking` flag and
 * `ranking_manage` permission.
 */
export function RankingAdminPage(): React.ReactElement {
  const flag = useAdminFeatureFlag('phase7_admin_ranking');
  const permission = usePermission('ranking_recalculate');

  // Feature flag off → render the disabled notice (the route handoff
  // file already does this, but the page is also guarded at the
  // component level for SSR safety).
  if (flag.isPlaceholder) {
    // Disabled notice mirrors the route handoff style — see
    // `RankingsAdminRouteHandoff`. The copy is local because the
    // page is rendered conditionally by the route when the flag is live.
    return (
      <div
        data-testid="ranking-admin-disabled-notice"
        className="flex flex-col gap-2 rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 p-6"
      >
        <p className="text-sm font-semibold text-foreground">
          Ranking admin coming soon
        </p>
        <p className="text-sm text-muted-foreground">
          The <code>phase7_admin_ranking</code> flag is at its default
          value. Enable it to expose the ranking recalculate, consistency
          check, and period reset surfaces.
        </p>
      </div>
    );
  }

  // Permission pending → render a skeleton so the page does not
  // flash empty controls.
  if (permission.isLoading) {
    return (
      <div
        data-testid="ranking-admin-permission-pending"
        className="flex flex-col gap-6"
      >
        <Skeleton className="h-8 w-1/3" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="ranking-admin-page"
      className="flex flex-col gap-6"
    >
      <AdminPageHeader
        title="Ranking Admin"
        description="Recalculate rankings, check consistency, and reset ranking periods."
      />

      <div
        data-testid="ranking-admin-grid"
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <RecalculateRankingPanel />
        <PeriodResetPanel />
        <ConsistencyCheckPanel />
      </div>
    </div>
  );
}
