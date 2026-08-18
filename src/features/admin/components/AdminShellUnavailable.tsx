'use client';

import type { ReactNode } from 'react';

import { Shield } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';

import { useAdminFeatureFlag } from '../hooks/useAdminFeatureFlag';

export interface AdminShellUnavailableProps {

children: ReactNode;
}

export function AdminShellUnavailable({
children,
}: AdminShellUnavailableProps) {
const { isPlaceholder } = useAdminFeatureFlag('admin_live');

if (isPlaceholder) {
return (
<EmptyState
icon={Shield}
title="Admin surfaces coming soon"
description={
'The admin console is not yet enabled in this environment. ' +
'Set NEXT_PUBLIC_ADMIN_LIVE=live to preview the admin surfaces, ' +
'or contact your administrator to enable the flag.'
        }
size="md"
      />
    );
  }

return <>{children}</>;
}
