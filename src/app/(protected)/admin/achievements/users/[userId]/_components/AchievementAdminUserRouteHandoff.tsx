'use client';

import { useEffect } from 'react';

import { ShieldAlert } from 'lucide-react';

import { useAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';
import { AchievementAdminUserPage } from '@/features/admin/achievement-admin/components/AchievementAdminUserPage';
import { logger } from '@/shared/log';

function AchievementAdminDisabledNotice() {
return (
<div
data-testid="achievement-admin-disabled-notice"
className="flex items-start gap-3 rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 px-4 py-6"
    >
<ShieldAlert
aria-hidden="true"
className="mt-0.5 h-5 w-5 text-muted-foreground"
      />
<div className="space-y-1">
<p className="text-sm font-semibold text-foreground">
Achievement admin coming soon
        </p>
<p className="text-sm text-muted-foreground">
The{' '}
<code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
admin_achievement_live
          </code>{' '}
flag is at its default value. Enable it to expose the
          re-evaluation and badge revocation surface for user achievements.
        </p>
</div>
</div>
  );
}

export interface AchievementAdminUserRouteHandoffProps {
userId: string;
}

export function AchievementAdminUserRouteHandoff({
userId,
}: AchievementAdminUserRouteHandoffProps) {
const { value: flagValue } = useAdminFeatureFlag('admin_achievement_live');

useEffect(() => {
logger.debug('admin.achievement', 'mount', { userId, flag: flagValue });
  }, [userId, flagValue]);

if (flagValue !== 'live') {
return <AchievementAdminDisabledNotice />;
  }

return <AchievementAdminUserPage userId={userId} />;
}
