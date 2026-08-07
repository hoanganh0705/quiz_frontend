/**
 * `features/admin/user-role-admin/hooks/useUserRoles.ts`
 *
 * Source epic:   Epic 7.10 — User Role Grant: USER_GRANT_ROLE with Secondary Confirm.
 * Source ticket: TKT-7.10.C2.
 *
 * ## What this hook owns
 *
 * - Fetch a user's current roles through the admin service layer
 *   (`getUserRoles` from `user-role-admin.service.ts`).
 * - Validate the `userId` before any fetch fires.
 * - Expose `{ roles, isLoading, error, refetch }` for the admin surface.
 * - Feature-flag gating via `phase7_admin_user_role`.
 *
 * ## Validation gate
 *
 * When `userId` is null or empty, the hook returns safe fallback
 * `{ roles: [], isLoading: false, error: null }` without firing a request.
 *
 * ## SWR cache
 *
 * Uses the cache key from B3 (`userRoleListKey`) so that grant/revoke
 * mutations can invalidate this cache on completion.
 */

import { useCallback, useMemo } from 'react';

import useSWR from 'swr';

import { ApiError } from '@/lib/api/core/ApiError';
import { getFeatureFlagValue } from '@/lib/feature-flags';

import { getUserRoles } from '@/features/admin/services/user-role-admin.service';
import type { UserRoleDto } from '../user-role-admin-types';
import { userRoleListKey } from '../user-role-admin-cache';

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseUserRolesResult {
  /** The user's current roles. Empty when loading, errored, or disabled. */
  readonly roles: readonly UserRoleDto[];
  /** True while the first fetch is in flight. */
  readonly isLoading: boolean;
  /** The most recent error, if any. */
  readonly error: ApiError | null;
  /** Revalidate the role list. */
  readonly refetch: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────

/**
 * Read a user's current roles for the user role admin surface.
 *
 * Returns safe fallback when the flag is off or userId is null.
 */
export function useUserRoles(userId: string | null): UseUserRolesResult {
  const flagValue = getFeatureFlagValue('phase7_admin_user_role');
  const isFlagPlaceholder = flagValue === 'placeholder';

  // Disabled sentinel when flag is off or userId is null/empty
  const isDisabled =
    isFlagPlaceholder || userId === null || userId === undefined || userId.trim() === '';

  const key = useMemo<readonly [string] | readonly ['disabled']>(
    () =>
      isDisabled
        ? (['disabled'] as const)
        : ([userRoleListKey(userId)] as const),
    [isDisabled, userId],
  );

  const fetcher = useCallback(async (): Promise<UserRoleDto[]> => {
    if (isDisabled || userId === null || userId === undefined) {
      return [];
    }
    return getUserRoles(userId);
  }, [isDisabled, userId]);

  const { data, error, isLoading, mutate } = useSWR<UserRoleDto[], ApiError>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    },
  );

  const refetch = useCallback(() => {
    void mutate();
  }, [mutate]);

  return {
    roles: data ?? [],
    isLoading,
    error: error ?? null,
    refetch,
  };
}
