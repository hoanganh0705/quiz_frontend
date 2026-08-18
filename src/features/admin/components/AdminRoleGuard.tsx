'use client';

import type { ReactNode } from 'react';

import { Loader2 } from 'lucide-react';

import { useAdminRole } from '../hooks/useAdminRole';
import { PermissionDeniedNotice } from './PermissionDeniedNotice';

export type AdminRoleStatus = 'unknown' | 'non-admin' | 'admin';

export interface AdminRoleGuardProps {
children: ReactNode;
fallback?: ReactNode;
}

export function AdminRoleGuard({ children, fallback }: AdminRoleGuardProps) {
const role = useAdminRole();

let status: AdminRoleStatus;
if (role.isLoading) {
status = 'unknown';
  } else if (role.role === 'admin') {
status = 'admin';
  } else {
status = 'non-admin';
  }

if (status === 'unknown') {
return (
<>
{fallback ?? (
<div
data-testid="admin-role-guard-skeleton"
aria-busy="true"
className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground"
          >
<Loader2
className="h-4 w-4 animate-spin"
aria-hidden="true"
            />
<span>Checking admin access…</span>
</div>
        )}
</>
    );
  }

if (status === 'non-admin') {
return (
<div data-testid="admin-role-guard-denied">
<PermissionDeniedNotice variant="route" />
</div>
    );
  }

return (
<div data-testid="admin-role-guard-allowed" data-status={status}>
{children}
</div>
  );
}
