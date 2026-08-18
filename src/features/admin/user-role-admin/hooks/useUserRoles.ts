

import { useCallback, useMemo } from 'react';

import useSWR from 'swr';

import { ApiError } from '@/lib/api/core/ApiError';
import { getFeatureFlagValue } from '@/lib/feature-flags';

import { getUserRoles } from '@/features/admin/services/user-role-admin.service';
import type { UserRoleDto } from '../user-role-admin-types';
import { userRoleListKey } from '../user-role-admin-cache';

export interface UseUserRolesResult {

readonly roles: readonly UserRoleDto[];

readonly isLoading: boolean;

readonly error: ApiError | null;

readonly refetch: () => void;
}

export function useUserRoles(userId: string | null): UseUserRolesResult {
const flagValue = getFeatureFlagValue('admin_user_role_live');
const isFlagPlaceholder = flagValue === 'placeholder';

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
