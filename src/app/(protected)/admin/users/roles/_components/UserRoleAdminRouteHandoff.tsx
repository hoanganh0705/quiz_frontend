'use client';

import { useEffect } from 'react';

import { ShieldAlert } from 'lucide-react';

import { useAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';
import { UserRoleAdminPage } from '@/features/admin/user-role-admin/components/UserRoleAdminPage';
import { logger } from '@/shared/log';

function UserRoleAdminDisabledNotice() {
return (
<div
data-testid="user-role-admin-disabled-notice"
className="flex items-start gap-3 rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 px-4 py-6"
    >
<ShieldAlert
aria-hidden="true"
className="mt-0.5 h-5 w-5 text-muted-foreground"
      />
<div className="space-y-1">
<p className="text-sm font-semibold text-foreground">
User role admin coming soon
        </p>
<p className="text-sm text-muted-foreground">
The{' '}
<code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
admin_user_role_live
          </code>{' '}
flag is at its default value. Enable it to expose the
          role grant and revoke surface.
        </p>
</div>
</div>
  );
}

function UserRoleAdminComingSoon() {
return (
<div
data-testid="user-role-admin-coming-soon"
className="flex flex-col items-center justify-center rounded-md border border-muted bg-muted/40 px-4 py-12"
    >
<p className="text-sm font-medium text-foreground">
User role admin surface
      </p>
<p className="mt-1 text-sm text-muted-foreground">
The full role grant and revoke interface is coming soon.
      </p>
</div>
  );
}

export function UserRoleAdminRouteHandoff() {
const { value: flagValue } = useAdminFeatureFlag('admin_user_role_live');

useEffect(() => {
logger.debug('admin.user-role', 'mount', { flag: flagValue });
  }, [flagValue]);

if (flagValue !== 'live') {
return <UserRoleAdminDisabledNotice />;
  }

return <UserRoleAdminPage />;
}
