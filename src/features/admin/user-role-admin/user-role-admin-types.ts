

import type {
AdminPermission,
} from '@/features/admin/permissions';

export type UserRoleAdminErrorCode =
| 'ROLE_NOT_FOUND'
  | 'ALREADY_GRANTED'
  | 'NOT_GRANTED'
  | 'SELF_ROLE_REVOKE_FORBIDDEN'
  | 'IRREVERSIBLE_CONFIRM_REQUIRED'
  | 'PERMISSION_DENIED';

export type UserRoleGrantAction = 'grant' | 'revoke';

export interface UserRoleGrantDto {
role: AdminPermission;
}

export interface UserRoleGrantResponseDto {
userId: string;
role: AdminPermission;
grantedAt: string;
}

export interface UserRoleDto {
role: AdminPermission;
grantedAt: string;
}

export type UserRoleListDto = UserRoleDto[];

export interface UserSearchResultDto {
userId: string;
username: string;
email: string;
avatar: string | null;
currentRoles: AdminPermission[];
}

export interface DocumentedRole {
name: AdminPermission;
description: string;
isHighestPrivilege: boolean;
}

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
