'use client';

import { useAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';
import { usePermission } from '@/features/admin/hooks/usePermission';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminPageHeader } from '@/app/(protected)/admin/_components/AdminPageHeader';

import { ConsistencyCheckPanel } from './ConsistencyCheckPanel';
import { PeriodResetPanel } from './PeriodResetPanel';
import { RecalculateRankingPanel } from './RecalculateRankingPanel';

export function RankingAdminPage(): React.ReactElement {
const flag = useAdminFeatureFlag('admin_ranking_live');
const permission = usePermission('ranking_recalculate');

if (flag.isPlaceholder) {

return (
<div
data-testid="ranking-admin-disabled-notice"
className="flex flex-col gap-2 rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 p-6"
      >
<p className="text-sm font-semibold text-foreground">
Ranking admin coming soon
        </p>
<p className="text-sm text-muted-foreground">
The <code>admin_ranking_live</code> flag is at its default
          value. Enable it to expose the ranking recalculate, consistency
          check, and period reset surfaces.
        </p>
</div>
    );
  }

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
