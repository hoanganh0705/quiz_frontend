

import { orvalCustomInstance } from '@/lib/api/core/custom-instance';
import { ApiError } from '@/lib/api/core/ApiError';
import { useUserStore } from '@/features/users/store/user-store';

import {
ADMIN_PERMISSIONS,
PERMISSIONS,
type AdminPermission,
} from '../permissions';

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

function currentUserId(): string | null {
return useUserStore.getState().user?.userId ?? null;
}

export async function grantUserRole(
userId: string,
input: UserRoleGrantDto,
): Promise<UserRoleGrantResponseDto> {
if (!ADMIN_PERMISSIONS.includes(input.role)) {
throw new Error(
`Invalid role: ${input.role} is not a member of PERMISSIONS (${ADMIN_PERMISSIONS.join(', ')})`,
    );
  }
const wire = await orvalCustomInstance<{ data: UserRoleGrantResponseDto }>({
url: `/api/v1/admin/users/${userId}/roles`,
method: 'POST',
headers: { 'Content-Type': 'application/json' },
data: { role: input.role },
  });

return (wire as { data: UserRoleGrantResponseDto }).data;
}

export async function revokeUserRole(
userId: string,
role: AdminPermission,
): Promise<UserRoleGrantResponseDto> {
if (!ADMIN_PERMISSIONS.includes(role)) {
throw new Error(
`Invalid role: ${role} is not a member of PERMISSIONS (${ADMIN_PERMISSIONS.join(', ')})`,
    );
  }
const caller = currentUserId();
if (caller !== null && caller === userId) {
throw new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: 'Cannot revoke a role from your own account',
config: undefined,
request: undefined,
response: {
status: 403,
data: {
status: 403,
detail: 'Cannot revoke a role from your own account',
title: 'SelfRoleRevokeForbidden',
extensions: {
code: 'SELF_ROLE_REVOKE_FORBIDDEN',
requestId: 'service-layer',
          },
        },
      },
toJSON: () => ({}),
    } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
  }
const wire = await orvalCustomInstance<{ data: UserRoleGrantResponseDto }>({
url: `/api/v1/admin/users/${userId}/roles/${role}`,
method: 'DELETE',
  });
return (wire as { data: UserRoleGrantResponseDto }).data;
}

export async function getUserRoles(userId: string): Promise<UserRoleDto[]> {
const wire = await orvalCustomInstance<{ data: UserRoleDto[] }>({
url: `/api/v1/admin/users/${userId}/roles`,
method: 'GET',
  });
return (wire as { data: UserRoleDto[] }).data;
}

export { PERMISSIONS };
export type { AdminPermission };
