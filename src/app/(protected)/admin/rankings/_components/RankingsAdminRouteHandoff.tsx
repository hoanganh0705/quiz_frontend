'use client';

import { useEffect } from 'react';

import { ShieldAlert } from 'lucide-react';

import { useAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';
import { RankingAdminPage } from '@/features/admin/ranking-admin/components';
import { logger } from '@/shared/log';

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
admin_ranking_live
          </code>{' '}
flag is at its default value. Enable it to expose the ranking
          recalculate, consistency check, and period reset surfaces.
        </p>
</div>
</div>
  );
}

export function RankingsAdminRouteHandoff() {
const { value: flagValue } = useAdminFeatureFlag('admin_ranking_live');

useEffect(() => {
logger.debug('admin.ranking', 'mount', { flag: flagValue });
  }, [flagValue]);

if (flagValue !== 'live') {
return <RankingAdminDisabledNotice />;
  }

return <RankingAdminPage />;
}
