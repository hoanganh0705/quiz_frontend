'use client';

import { useMemo } from 'react';

import { useAuth } from '@/features/auth/hooks/use-auth';
import {
ADMIN_PERMISSIONS,
type AdminPermission,
} from '../permissions';

export interface AdminRoleDocument {
isLoading: boolean;
error: Error | null;
role: string | null;
permissions: readonly AdminPermission[];
}

export const ROLE_PERMISSION_MAP: Readonly<Record<string, readonly AdminPermission[]>> =
Object.freeze({
admin: ADMIN_PERMISSIONS,
moderator: Object.freeze([
'review_report_read',
'review_report_update',
'comment_report_read',
'comment_report_update',
'comment_hide',
'comment_restore',
    ]),
  }) as Readonly<Record<string, readonly AdminPermission[]>>;

export function resolveAdminPermissions(
role: string | null,
): readonly AdminPermission[] {
if (typeof role !== 'string') return [];
const granted = ROLE_PERMISSION_MAP[role];
return granted ?? [];
}

export function useAdminRole(): AdminRoleDocument {
const auth = useAuth();

const role: string | null = auth?.currentUser?.role ?? null;
const permissions = useMemo(
() => resolveAdminPermissions(role),
[role],
  );
return {
isLoading: auth.isLoading,
error: auth?.error ?? null,
role,
permissions,
  };
}
