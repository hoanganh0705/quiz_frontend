"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api/core/ApiError";

import { getUserRoles } from "@/features/admin/services/user-role-admin.service";
import type { UserRoleDto } from "../user-role-admin-types";
import { userRoleListKey } from "../user-role-admin-cache";

export interface UseUserRolesResult {
  readonly roles: readonly UserRoleDto[];
  readonly isLoading: boolean;
  readonly error: ApiError | null;
  readonly refetch: () => void;
}

export function useUserRoles(userId: string | null): UseUserRolesResult {
  const isDisabled =
    userId === null ||
    userId === undefined ||
    userId.trim() === "";

  const key = useMemo<readonly [string] | readonly ["disabled"]>(
    () =>
      isDisabled
        ? (["disabled"] as const)
        : ([userRoleListKey(userId)] as const),
    [isDisabled, userId],
  );

  const fetcher = useCallback(async (): Promise<UserRoleDto[]> => {
    if (isDisabled || userId === null || userId === undefined) {
      return [];
    }
    return getUserRoles(userId);
  }, [isDisabled, userId]);

  const {
    data,
    error,
    isLoading,
    refetch: queryRefetch,
  } = useQuery<UserRoleDto[], ApiError>(
    {
      queryKey: key,
      queryFn: fetcher,
      enabled: !isDisabled,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    getQueryClient(),
  );

  const refetch = useCallback(() => {
    void queryRefetch();
  }, [queryRefetch]);

  return {
    roles: isDisabled ? [] : (data ?? []),
    isLoading: isDisabled ? false : isLoading && data === undefined,
    error: isDisabled ? null : (error ?? null),
    refetch,
  };
}
