import { orvalCustomInstance } from "@/lib/api/core/custom-instance";
import { ApiError } from "@/lib/api/core/ApiError";
import { useUserStore } from "@/features/users/store/user-store";

import type { AdminPermission } from "../permissions";
export { ADMIN_PERMISSIONS, PERMISSIONS } from "../permissions";

export type AdminRoleOrPermission =
  | AdminPermission
  | "admin"
  | "moderator"
  | "user"
  | string;

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

function currentUserId(): string | null {
  return useUserStore.getState().user?.userId ?? null;
}

/**
 * Grants a role to a user.
 * @throws {ApiError} ROLE_NOT_FOUND
 * @throws {ApiError} ALREADY_GRANTED
 */
export async function grantUserRole(
  userId: string,
  input: UserRoleGrantDto,
): Promise<UserRoleGrantResponseDto> {
  const trimmed = input.role?.trim();
  if (!trimmed) {
    throw new Error("Invalid role: role cannot be empty");
  }
  const wire = await orvalCustomInstance<{ data: UserRoleGrantResponseDto }>({
    url: `/api/v1/admin/users/${userId}/roles`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: { role: trimmed },
  });

  return (wire as { data: UserRoleGrantResponseDto }).data;
}

/**
 * Revokes a role from a user.
 * @throws {ApiError} SELF_ROLE_REVOKE_FORBIDDEN
 * @throws {ApiError} NOT_GRANTED
 */
export async function revokeUserRole(
  userId: string,
  role: AdminRoleOrPermission,
): Promise<UserRoleGrantResponseDto> {
  const trimmed = role?.trim();
  if (!trimmed) {
    throw new Error("Invalid role: role cannot be empty");
  }
  const caller = currentUserId();
  if (caller !== null && caller === userId) {
    throw new ApiError({
      isAxiosError: true,
      name: "AxiosError",
      message: "Cannot revoke a role from your own account",
      config: undefined,
      request: undefined,
      response: {
        status: 403,
        data: {
          status: 403,
          detail: "Cannot revoke a role from your own account",
          title: "SelfRoleRevokeForbidden",
          extensions: {
            code: "SELF_ROLE_REVOKE_FORBIDDEN",
            requestId: "service-layer",
          },
        },
      },
      toJSON: () => ({}),
    } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
  }
  const wire = await orvalCustomInstance<{ data: UserRoleGrantResponseDto }>({
    url: `/api/v1/admin/users/${userId}/roles/${encodeURIComponent(trimmed)}`,
    method: "DELETE",
  });
  return (wire as { data: UserRoleGrantResponseDto }).data;
}

export async function getUserRoles(userId: string): Promise<UserRoleDto[]> {
  const wire = await orvalCustomInstance<{ data: UserRoleDto[] }>({
    url: `/api/v1/admin/users/${userId}/roles`,
    method: "GET",
  });
  return (wire as { data: UserRoleDto[] }).data;
}

export type { AdminPermission };
