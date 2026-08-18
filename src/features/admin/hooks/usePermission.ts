'use client';

import { useAdminRole } from './useAdminRole';
import type { AdminPermission } from '../permissions';

export interface UsePermission {
isLoading: boolean;
error: Error | null;
hasPermission: boolean;
}

export function usePermission(name: AdminPermission): UsePermission {
const role = useAdminRole();
const isLoading = role.isLoading;
const error = role.error;
const hasPermission = role.permissions.includes(name);
return { isLoading, error, hasPermission };
}
