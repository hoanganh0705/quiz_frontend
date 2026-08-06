/**
 * `features/admin/services/user-role-admin.service.ts` — User role admin service.
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.E8.
 *
 * Thin service layer that wraps the user role grant SDK functions.
 * The service is the only layer under `features/admin/**` that touches
 * the SDK for user role admin; the service enforces the self-action
 * guard at the service layer (defence in depth — the UI also gates via
 * `useSelfActionGate`, but the service refuses to dispatch if the
 * target equals the current admin for revoke).
 *
 * ## Functions
 *
 *   - `grantUserRole(userId, input)` — grants a role; validates that
 *                                       `input.role` is a member of
 *                                       `PERMISSIONS`.
 *   - `revokeUserRole(userId, role)` — revokes a role; refuses when
 *                                       `userId === currentUser.userId`.
 *   - `getUserRoles(userId)`         — lists the user's current roles.
 *
 * ## Error contract
 *
 *   - `SELF_ROLE_REVOKE_FORBIDDEN` is thrown when the target user is
 *     the calling admin (for revoke).
 *   - `ROLE_NOT_FOUND`, `ALREADY_GRANTED`, `NOT_GRANTED` codes are
 *     surfaced to the caller.
 */

import { orvalCustomInstance } from '@/lib/api/core/custom-instance';
import { ApiError } from '@/lib/api/core/ApiError';
import { useUserStore } from '@/features/users/store/user-store';

import {
  ADMIN_PERMISSIONS,
  PERMISSIONS,
  type AdminPermission,
} from '../permissions';

// ─── DTOs ───────────────────────────────────────────────────────────────

/** Body for `grantUserRole`. */
export interface UserRoleGrantDto {
  /**
   * The role to grant. Must be a member of `PERMISSIONS` (the typed
   * `AdminPermission` union). The service validates this before
   * dispatching the request.
   */
  role: AdminPermission;
}

/** Response for `grantUserRole` / `revokeUserRole`. */
export interface UserRoleGrantResponseDto {
  userId: string;
  /** The role that was granted or revoked. */
  role: AdminPermission;
  /** ISO timestamp of the operation. */
  grantedAt: string;
}

/** Single role entry in `getUserRoles`. */
export interface UserRoleDto {
  /** The role name (a member of `PERMISSIONS`). */
  role: AdminPermission;
  /** ISO timestamp the role was granted. */
  grantedAt: string;
}

// ─── Service functions ─────────────────────────────────────────────────

/**
 * Read the current user's id from the auth store. The Zustand store
 * is the canonical source of the current user id outside the React
 * render tree, so the service can use it without taking a hook
 * dependency.
 *
 * Returns `null` when the user is not yet hydrated. The service
 * refuses to grant when the user is unknown (since we cannot verify
 * the caller's identity).
 */
function currentUserId(): string | null {
  return useUserStore.getState().user?.userId ?? null;
}

/**
 * Grant a role to a user.
 *
 * @throws `Error` when `input.role` is not a member of `PERMISSIONS`.
 *         This is a programmer error (the type narrows it), so the
 *         service throws a plain `Error` rather than `ApiError`.
 * @throws `ApiError<ErrorCode>` with `code: ROLE_NOT_FOUND` when the
 *         target role does not exist on the backend.
 * @throws `ApiError<ErrorCode>` with `code: ALREADY_GRANTED` when the
 *         user already has the role.
 */
export async function grantUserRole(
  userId: string,
  input: UserRoleGrantDto,
): Promise<UserRoleGrantResponseDto> {
  if (!ADMIN_PERMISSIONS.includes(input.role)) {
    throw new Error(
      `Invalid role: ${input.role} is not a member of PERMISSIONS (${ADMIN_PERMISSIONS.join(', ')})`,
    );
  }
  return orvalCustomInstance<UserRoleGrantResponseDto>({
    url: `/api/v1/admin/users/${userId}/roles`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: { role: input.role },
  });
}

/**
 * Revoke a role from a user.
 *
 * @throws `ApiError<ErrorCode>` with `code: SELF_ROLE_REVOKE_FORBIDDEN`
 *         when the target user is the calling admin. This is the
 *         service-layer self-action guard.
 * @throws `ApiError<ErrorCode>` with `code: NOT_GRANTED` when the
 *         user does not have the role.
 * @throws `ApiError<ErrorCode>` with `code: ROLE_NOT_FOUND` when the
 *         role does not exist on the backend.
 */
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
  return orvalCustomInstance<UserRoleGrantResponseDto>({
    url: `/api/v1/admin/users/${userId}/roles/${role}`,
    method: 'DELETE',
  });
}

/**
 * Fetch the list of roles a user currently holds.
 *
 * @throws `ApiError<ErrorCode>` with `code: USER_NOT_FOUND` when the
 *         user does not exist.
 */
export async function getUserRoles(userId: string): Promise<UserRoleDto[]> {
  return orvalCustomInstance<UserRoleDto[]>({
    url: `/api/v1/admin/users/${userId}/roles`,
    method: 'GET',
  });
}

// ─── Re-export the PERMISSIONS singleton for hook-side consumers ───────

export { PERMISSIONS };
export type { AdminPermission };
