

'use client';

import { useCallback, useEffect } from 'react';

import { useAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';
import { AdminPageHeader } from '@/app/(protected)/admin/_components/AdminPageHeader';
import { AdminRoleGuard } from '@/features/admin/components/AdminRoleGuard';
import { addAchievementAdminBreadcrumb } from '@/lib/admin/admin_live_sentry';

import {
AchievementAdminBadgeList,
ReevaluateButton,
ReevaluateResultSummary,
ReevaluateRunningIndicator,
UserAchievementHistoryPanel,
} from './';

import { useReevaluateUserAchievements } from '../hooks';
import { validateUserId } from '../validation';
import {
subscribeAchievementAdminInvalidate,
handleAchievementAdminInvalidation,
} from '../broadcast';

const DISABLED_NOTICE_COPY = {
title: 'Achievement Admin',
description:
'Achievement administration is not yet available in your environment. Please check back in a future release.',
} as const;

const PAGE_TITLE = 'Manage user achievements';
const PAGE_DESCRIPTION =
"View a user's badges, history, and re-evaluate their achievements.";

export interface AchievementAdminUserPageProps {

userId: string;
}

export function AchievementAdminUserPage({
userId,
}: AchievementAdminUserPageProps): React.ReactElement {
const validation = validateUserId(userId);
const isValid = validation.ok;

const { lifecycle, reset } = useReevaluateUserAchievements(
isValid ? userId : '',
  );

const { value: flagValue } = useAdminFeatureFlag('admin_achievement_live');

useEffect(() => {
if (!isValid) return;

addAchievementAdminBreadcrumb({
route: 'achievement-admin.mount',
action: 'achievement-admin.mount',
targetId: userId,
status: 'started',
durationMs: 0,
    });

return () => {
addAchievementAdminBreadcrumb({
route: 'achievement-admin.unmount',
action: 'achievement-admin.unmount',
targetId: userId,
status: 'skipped',
durationMs: 0,
      });
    };
  }, [isValid, userId]);

useEffect(() => {
if (!isValid) return;

const unsubscribe = subscribeAchievementAdminInvalidate(
handleAchievementAdminInvalidation,
    );

return unsubscribe;
  }, [isValid, userId]);

const handleReevaluateCompleted = useCallback(() => {
    // The lifecycle hook handles SWR invalidation internally.
    // This callback exists so the page can extend behaviour (e.g. analytics)
    // without coupling the button to the list.
  }, []);

if (flagValue !== 'live') {
return (
<div className="mx-auto max-w-3xl py-8">
<AdminPageHeader
title={DISABLED_NOTICE_COPY.title}
description={DISABLED_NOTICE_COPY.description}
        />
</div>
    );
  }

if (!isValid) {
return (
<div className="mx-auto max-w-3xl py-8">
<AdminPageHeader
title="Invalid user"
description="The user ID provided is not valid. Please check the URL."
        />
</div>
    );
  }

return (
<AdminRoleGuard>
<div className="mx-auto max-w-3xl py-8 space-y-8">
{/* Page header with re-evaluate action */}
<div className="space-y-4">
<AdminPageHeader
title={PAGE_TITLE}
description={PAGE_DESCRIPTION}
          />

{/* Re-evaluate affordance */}
<div className="rounded-md border border-border bg-card p-4">
<p className="mb-3 text-sm font-medium text-foreground">
Re-evaluation
            </p>
<ReevaluateButton userId={userId} onCompleted={handleReevaluateCompleted} />
<ReevaluateRunningIndicator userId={userId} />
<ReevaluateResultSummary userId={userId} />
</div>
</div>

{/* Badge list */}
<section aria-labelledby="badge-list-heading">
<h2
id="badge-list-heading"
className="mb-3 text-sm font-semibold text-foreground"
          >
Badges
          </h2>
<AchievementAdminBadgeList userId={userId} />
</section>

{/* Achievement history */}
<section aria-labelledby="history-heading">
<h2
id="history-heading"
className="mb-3 text-sm font-semibold text-foreground"
          >
Badge history
          </h2>
<UserAchievementHistoryPanel userId={userId} />
</section>
</div>
</AdminRoleGuard>
  );
}
