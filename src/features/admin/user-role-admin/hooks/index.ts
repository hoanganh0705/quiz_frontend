/**
 * `features/admin/user-role-admin/hooks/index.ts`
 *
 * Barrel export for all user-role-admin hooks.
 *
 * Source epic:   Epic 7.10.
 * Source ticket: TKT-7.10.C1, TKT-7.10.C2, TKT-7.10.D1, TKT-7.10.D2.
 */

export { useUserSearch } from './useUserSearch';
export type { UseUserSearchResult } from './useUserSearch';

export { useUserRoles } from './useUserRoles';
export type { UseUserRolesResult } from './useUserRoles';

export { useGrantUserRole } from './useGrantUserRole';
export type { UseGrantUserRoleAudit, UseGrantUserRoleResult } from './useGrantUserRole';

export { useRevokeUserRole } from './useRevokeUserRole';
export type { UseRevokeUserRoleAudit, UseRevokeUserRoleResult } from './useRevokeUserRole';
