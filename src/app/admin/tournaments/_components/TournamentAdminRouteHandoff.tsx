'use client';

/**
 * `app/admin/tournaments/_components/TournamentAdminRouteHandoff.tsx`
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.F2 (route-level wiring).
 *
 * ## Purpose
 *
 * Dev-time observability + per-area feature-flag boundary component
 * rendered by the `/admin/tournaments` route. Calls
 * `addTournamentAdminBreadcrumb` on mount so QA can verify the route
 * passes through the Epic 7.1 Sentry helpers, and delegates to
 * `<TournamentAdminPage />` when `phase7_admin_tournament === 'enabled'`.
 *
 * ## Routing chain
 *
 *   `/admin/tournaments`
 *     → `TournamentAdminRouteHandoff` (this component)
 *       → `<TournamentAdminPage />` (when flag is enabled)
 *
 * ## No network calls
 *
 * This component is purely a diagnostic + gate shell. The breadcrumb
 * is purely opt-in observability and never blocks rendering.
 */

import { useEffect } from 'react';

import { ShieldAlert } from 'lucide-react';

import { addTournamentAdminBreadcrumb } from '@/lib/admin/phase7_admin_sentry';
import { useAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';
import { TournamentAdminPage } from '@/features/admin/tournament-admin/components/TournamentAdminPage';

export function TournamentAdminRouteHandoff() {
  const { value: flagValue, isPlaceholder } = useAdminFeatureFlag(
    'phase7_admin_tournament',
  );

  // Emit breadcrumb on mount for observability.
  useEffect(() => {
    addTournamentAdminBreadcrumb({
      action: 'tournament-admin.mount',
      route: 'tournament-admin.page',
      status: 'started',
      durationMs: 0,
    });
  }, []);

  // Feature flag not yet live → render the disabled notice.
  if (flagValue !== 'live') {
    return (
      <div
        data-testid="tournament-admin-disabled-notice"
        className="flex items-start gap-3 rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 px-4 py-6"
      >
        <ShieldAlert
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 text-muted-foreground"
        />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            Tournament admin coming soon
          </p>
          <p className="text-sm text-muted-foreground">
            The{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              phase7_admin_tournament
            </code>{' '}
            flag is at its default value. Enable it to expose the
            create / update / delete surface for tournaments.
          </p>
        </div>
      </div>
    );
  }

  // Feature flag enabled → delegate to TournamentAdminPage.
  // The page itself handles the feature-flag check and renders
  // the disabled notice or the full admin surface.
  return <TournamentAdminPage />;
}
