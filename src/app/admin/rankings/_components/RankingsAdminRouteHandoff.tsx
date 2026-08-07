'use client';

/**
 * `app/admin/rankings/_components/RankingsAdminRouteHandoff.tsx`
 *
 * Source epic:   Epic 7.9 — Ranking Admin: Recalculate, Consistency Check, Period Reset.
 * Source ticket: TKT-7.9.A3 (route handoff) + TKT-7.9.F2 (page wiring).
 *
 * ## Purpose
 *
 * Dev-time observability + per-area feature-flag boundary component rendered
 * by the `/admin/rankings` route. Calls the Sentry breadcrumb on mount for
 * observability, and delegates to `<RankingAdminPage />` when
 * `phase7_admin_ranking === 'live'`.
 *
 * ## Routing chain
 *
 *   `/admin/rankings`
 *     → `RankingsAdminRouteHandoff` (this component)
 *       → `<RankingAdminPage />` (when flag is enabled; ships in F1)
 *
 * ## No network calls
 *
 * This component is purely a diagnostic + gate shell. The breadcrumb
 * is purely opt-in observability and never blocks rendering.
 */

import { useEffect } from 'react';

import { ShieldAlert } from 'lucide-react';

import { useAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';
import { RankingAdminPage } from '@/features/admin/ranking-admin/components';
import { logger } from '@/shared/log';

/**
 * Placeholder rendered when `phase7_admin_ranking` is not `'live'`.
 * Mirrors the disabled-notice pattern from other Phase 7 admin routes.
 */
function RankingAdminDisabledNotice() {
  return (
    <div
      data-testid="ranking-admin-disabled-notice"
      className="flex items-start gap-3 rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 px-4 py-6"
    >
      <ShieldAlert
        aria-hidden="true"
        className="mt-0.5 h-5 w-5 text-muted-foreground"
      />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          Ranking admin coming soon
        </p>
        <p className="text-sm text-muted-foreground">
          The{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            phase7_admin_ranking
          </code>{' '}
          flag is at its default value. Enable it to expose the ranking
          recalculate, consistency check, and period reset surfaces.
        </p>
      </div>
    </div>
  );
}

/**
 * Route handoff for the `/admin/rankings` page.
 *
 * Reads the `phase7_admin_ranking` flag and either:
 *   - Renders the disabled notice when the flag is `'placeholder'`.
 *   - Renders `<RankingAdminPage />` when the flag is `'live'`.
 *
 * The Sentry breadcrumb is emitted on mount for observability.
 */
export function RankingsAdminRouteHandoff() {
  const { value: flagValue } = useAdminFeatureFlag('phase7_admin_ranking');

  // Emit breadcrumb on mount for observability.
  useEffect(() => {
    logger.debug('admin.ranking', 'mount', { flag: flagValue });
  }, [flagValue]);

  // Feature flag not yet live → render the disabled notice.
  if (flagValue !== 'live') {
    return <RankingAdminDisabledNotice />;
  }

  // Feature flag enabled → render the full page assembly.
  return <RankingAdminPage />;
}
