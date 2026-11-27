import {
  ADMIN_PERMISSION_DESCRIPTIONS,
  ADMIN_PERMISSIONS,
} from "@/features/admin/permissions";

import type { AdminPermission } from "@/features/admin/permissions";
import type { AdminRoleOrPermission } from "@/features/admin/services/user-role-admin.service";

export type { AdminPermission, AdminRoleOrPermission };

export type UserRoleAdminErrorCode =
  | "ROLE_NOT_FOUND"
  | "ALREADY_GRANTED"
  | "NOT_GRANTED"
  | "SELF_ROLE_REVOKE_FORBIDDEN"
  | "IRREVERSIBLE_CONFIRM_REQUIRED"
  | "PERMISSION_DENIED";

export type UserRoleGrantAction = "grant" | "revoke";

export interface UserRoleGrantDto {
  role: AdminRoleOrPermission;
}

export interface UserRoleGrantResponseDto {
  userId: string;
  role: AdminRoleOrPermission;
  grantedAt: string;
}

export interface UserRoleDto {
  role: AdminRoleOrPermission;
  grantedAt: string;
}

export type UserRoleListDto = UserRoleDto[];

export interface UserSearchResultDto {
  userId: string;
  username: string;
  email: string;
  avatar: string | null;
  currentRoles: (AdminRoleOrPermission | string)[];
}

export interface DocumentedRole {
  name: AdminRoleOrPermission;
  description: string;
  isHighestPrivilege: boolean;
}

export const DOCUMENTED_ROLES: readonly DocumentedRole[] = [
  {
    name: "moderator",
    description:
      "Moderator role: review reports, moderate comments, manage content",
    isHighestPrivilege: false,
  },
  {
    name: "admin",
    description: "Full administrator privileges across the platform",
    isHighestPrivilege: true,
  },
  ...ADMIN_PERMISSIONS.map((permission): DocumentedRole => ({
    name: permission,
    description: ADMIN_PERMISSION_DESCRIPTIONS[permission],
    isHighestPrivilege: false,
  })),
] as const;
