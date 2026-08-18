'use client';

import { useEffect } from 'react';

import { ShieldAlert } from 'lucide-react';

import { addTournamentAdminBreadcrumb } from '@/lib/admin/admin_live_sentry';
import { useAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';
import { TournamentAdminPage } from '@/features/admin/tournament-admin/components/TournamentAdminPage';

export function TournamentAdminRouteHandoff() {
const { value: flagValue, isPlaceholder } = useAdminFeatureFlag(
'admin_tournament_live',
  );

useEffect(() => {
addTournamentAdminBreadcrumb({
action: 'tournament-admin.mount',
route: 'tournament-admin.page',
status: 'started',
durationMs: 0,
    });
  }, []);

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
admin_tournament_live
            </code>{' '}
flag is at its default value. Enable it to expose the
            create / update / delete surface for tournaments.
          </p>
</div>
</div>
    );
  }

return <TournamentAdminPage />;
}
