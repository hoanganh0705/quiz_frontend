'use client';

import { ShieldOff } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';

export type PermissionDeniedVariant = 'route' | 'control' | 'self-action';

export interface PermissionDeniedNoticeProps {
variant?: PermissionDeniedVariant;
className?: string;
}

const COPY: Readonly<Record<PermissionDeniedVariant, { title: string; description: string }>> = Object.freeze({
route: {
title: 'Restricted to administrators',
description: 'This page is restricted to administrators.',
  },
control: {
title: 'Action not available',
description: 'This action is not available for your account.',
  },
'self-action': {
title: 'Action not available on your own account',
description: 'You cannot perform this action on your own account.',
  },
});

export function PermissionDeniedNotice({
variant = 'route',
className,
}: PermissionDeniedNoticeProps) {
const copy = COPY[variant];
return (
<EmptyState
icon={ShieldOff}
title={copy.title}
description={copy.description}
className={className}
size="md"
    />
  );
}
