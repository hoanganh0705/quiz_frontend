'use client';

import type { ReactNode } from 'react';
import { DeletionGuard } from '@/features/auth/guards/deletion-guard';

export function SettingsDeletionGuardWrapper({
children,
}: {
children: ReactNode;
}): React.JSX.Element {
return <DeletionGuard>{children}</DeletionGuard>;
}
