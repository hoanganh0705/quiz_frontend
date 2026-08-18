'use client';

import type { ReactNode } from 'react';

import { AdminShellUnavailable } from './AdminShellUnavailable';
import { useAdminFeatureFlag } from '../hooks/useAdminFeatureFlag';

export interface AdminFeatureFlagBoundaryProps {
children: ReactNode;
}

export function AdminFeatureFlagBoundary({
children,
}: AdminFeatureFlagBoundaryProps) {
const { isLive } = useAdminFeatureFlag('admin_live');

if (!isLive) {
return (
<AdminShellUnavailable>{children}</AdminShellUnavailable>
    );
  }

return <>{children}</>;
}
