/**
 * `features/admin/user-role-admin/user-role-admin-types.ts`
 *
 * Source epic:   Epic 7.10 — User Role Grant: USER_GRANT_ROLE with Secondary Confirm.
 * Source ticket: TKT-7.10.B1.
 *
 * ## What this module owns
 *
 * The local type surface for user role admin DTOs and contracts. The module
 * re-exports SDK-generated types where available and adds locally-derived types
 * where the SDK does not expose them.
 *
 * ## Error codes
 *
 * This module extends the `ErrorCode` union from `lib/api/error-codes.ts`
 * with user-role-admin-specific codes for typed error branching in hooks
 * and components.
 */

import type {
  AdminPermission,
} from '@/features/admin/permissions';

// ─── Error codes for user role admin ──────────────────────────────────────────

/**
 * Subset of `ErrorCode` for user role admin error branching.
 * Covers all error codes that hooks and components need to branch on.
 */
export type UserRoleAdminErrorCode =
  | 'ROLE_NOT_FOUND'
  | 'ALREADY_GRANTED'
  | 'NOT_GRANTED'
  | 'SELF_ROLE_REVOKE_FORBIDDEN'
  | 'IRREVERSIBLE_CONFIRM_REQUIRED'
  | 'PERMISSION_DENIED';

// ─── Action type ─────────────────────────────────────────────────────────────

/**
 * Discriminated union for grant/revoke action type.
 */
export type UserRoleGrantAction = 'grant' | 'revoke';

// ─── DTOs from service layer ────────────────────────────────────────────────

/**
 * Body for `grantUserRole`.
 * Shape confirmed from `user-role-admin.service.ts`.
 */
export interface UserRoleGrantDto {
  role: AdminPermission;
}

/**
 * Response for `grantUserRole` / `revokeUserRole`.
 * Shape confirmed from `user-role-admin.service.ts`.
 */
export interface UserRoleGrantResponseDto {
  userId: string;
  role: AdminPermission;
  grantedAt: string;
}

/**
 * Single role entry returned by `getUserRoles`.
 * Shape confirmed from `user-role-admin.service.ts`.
 */
export interface UserRoleDto {
  role: AdminPermission;
  grantedAt: string;
}

/**
 * List of roles for a user.
 * Shape confirmed from `user-role-admin.service.ts`.
 */
export type UserRoleListDto = UserRoleDto[];

// ─── User search ─────────────────────────────────────────────────────────────

/**
 * User search result from the social user search endpoint.
 * Shape: from Phase 6 or local stub per TKT-7.10.C1.
 */
export interface UserSearchResultDto {
  userId: string;
  username: string;
  email: string;
  avatar: string | null;
  currentRoles: AdminPermission[];
}

// ─── Documented roles ─────────────────────────────────────────────────────────

/**
 * A documented role from the `ROLES` map / `PERMISSIONS` map.
 */
export interface DocumentedRole {
  name: AdminPermission;
  description: string;
  isHighestPrivilege: boolean;
}

/**
 * The complete fixed enumerated list of valid roles.
 *
 * This is derived from `ADMIN_PERMISSIONS` and supplemented with
 * display metadata. The list is stable and matches the backend's
 * `ROLES` map.
 *
 * NOTE: The `admin` role is not included as a grantable role here
 * because it is the highest privilege and should be granted with
 * extreme caution. This may be updated based on backend verification
 * in A1.
 */
export const DOCUMENTED_ROLES: readonly DocumentedRole[] = [
  {
    name: 'user_grant_role',
    description: 'Grant roles to users',
    isHighestPrivilege: false,
  },
  {
    name: 'user_revoke_role',
    description: 'Revoke roles from users',
    isHighestPrivilege: false,
  },
  {
    name: 'review_report_read',
    description: 'View review moderation reports',
    isHighestPrivilege: false,
  },
  {
    name: 'review_report_update',
    description: 'Update review moderation reports',
    isHighestPrivilege: false,
  },
  {
    name: 'comment_report_read',
    description: 'View comment moderation reports',
    isHighestPrivilege: false,
  },
  {
    name: 'comment_report_update',
    description: 'Update comment moderation reports',
    isHighestPrivilege: false,
  },
  {
    name: 'comment_hide',
    description: 'Hide comments',
    isHighestPrivilege: false,
  },
  {
    name: 'comment_restore',
    description: 'Restore hidden comments',
    isHighestPrivilege: false,
  },
  {
    name: 'tag_create',
    description: 'Create tags',
    isHighestPrivilege: false,
  },
  {
    name: 'tag_update',
    description: 'Update tags',
    isHighestPrivilege: false,
  },
  {
    name: 'tag_delete',
    description: 'Delete tags',
    isHighestPrivilege: false,
  },
  {
    name: 'tag_restore',
    description: 'Restore deleted tags',
    isHighestPrivilege: false,
  },
  {
    name: 'category_create',
    description: 'Create categories',
    isHighestPrivilege: false,
  },
  {
    name: 'category_update',
    description: 'Update categories',
    isHighestPrivilege: false,
  },
  {
    name: 'category_delete',
    description: 'Delete categories',
    isHighestPrivilege: false,
  },
  {
    name: 'category_restore',
    description: 'Restore deleted categories',
    isHighestPrivilege: false,
  },
  {
    name: 'ranking_recalculate',
    description: 'Recalculate rankings',
    isHighestPrivilege: false,
  },
  {
    name: 'ranking_reset',
    description: 'Reset ranking period',
    isHighestPrivilege: false,
  },
  {
    name: 'ranking_consistency_check',
    description: 'Check ranking consistency',
    isHighestPrivilege: false,
  },
  {
    name: 'achievement_reevaluate',
    description: 'Re-evaluate user achievements',
    isHighestPrivilege: false,
  },
  {
    name: 'achievement_badge_revoke',
    description: 'Revoke badges from users',
    isHighestPrivilege: false,
  },
  {
    name: 'tournament_create',
    description: 'Create tournaments',
    isHighestPrivilege: false,
  },
  {
    name: 'tournament_update',
    description: 'Update tournaments',
    isHighestPrivilege: false,
  },
  {
    name: 'tournament_delete',
    description: 'Delete tournaments',
    isHighestPrivilege: false,
  },
] as const;
