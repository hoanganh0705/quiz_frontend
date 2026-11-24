"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import {
  listAdminUsers,
  type AdminUserDto,
} from "@/features/admin/services/user-admin.service";
import { ApiError } from "@/lib/api/core/ApiError";

import type { UserSearchResultDto } from "../user-role-admin-types";
import { userRoleAdminSearchKey } from "../user-role-admin-cache";

export const USER_SEARCH_DEBOUNCE_MS = 300;

export const USER_SEARCH_MIN_QUERY_LENGTH = 2;

interface SearchUsersResponse {
  users: UserSearchResultDto[];
  total: number;
}

function useDebouncedValue(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export interface UseUserSearchResult {
  readonly users: readonly UserSearchResultDto[];
  readonly total: number;
  readonly isLoading: boolean;
  readonly isStale: boolean;
  readonly error: ApiError | null;
  readonly loadMore: () => void;
  readonly hasMore: boolean;
  readonly refetch: () => void;
}

const FALLBACK_RESULT: UseUserSearchResult = Object.freeze({
  users: [],
  total: 0,
  isLoading: false,
  isStale: false,
  error: null,
  loadMore: () => undefined,
  hasMore: false,
  refetch: () => undefined,
});

export function useUserSearch(query: string): UseUserSearchResult {
  const normalizedQuery = query.trim().toLowerCase();

  const debouncedQuery = useDebouncedValue(
    normalizedQuery,
    USER_SEARCH_DEBOUNCE_MS,
  );

  const isQueryValid = debouncedQuery.length >= USER_SEARCH_MIN_QUERY_LENGTH;

  const key = useMemo<readonly [string, string] | readonly ["disabled"]>(
    () =>
      isQueryValid
        ? ([userRoleAdminSearchKey(debouncedQuery), debouncedQuery] as const)
        : (["disabled"] as const),
    [debouncedQuery, isQueryValid],
  );

  const fetcher = useCallback(async (): Promise<SearchUsersResponse> => {
    if (!isQueryValid) {
      return { users: [], total: 0 };
    }

    const response = await listAdminUsers({
      search: debouncedQuery,
      limit: 20,
    });

    const items = response.data ?? [];

    return {
      users: items.map((item: AdminUserDto): UserSearchResultDto => ({
        userId: item.userId,
        username: item.username,
        email: item.email,
        avatar: item.avatarUrl,
        currentRoles: item.role ? [item.role] : [],
      })),
      total: response.meta?.pagination?.total ?? items.length,
    };
  }, [debouncedQuery, isQueryValid]);

  const { data, error, isLoading, refetch } = useQuery<SearchUsersResponse, ApiError>(
    {
      queryKey: key,
      queryFn: fetcher,
      enabled: isQueryValid,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    getQueryClient(),
  );

  const handleRefetch = useCallback(() => {
    if (isQueryValid) {
      void refetch();
    }
  }, [isQueryValid, refetch]);

  const loadMore = useCallback(() => {
    // Pagination placeholder
  }, []);

  if (normalizedQuery.length < USER_SEARCH_MIN_QUERY_LENGTH) {
    return {
      ...FALLBACK_RESULT,
      refetch: handleRefetch,
    };
  }

  return {
    users: data?.users ?? [],
    total: data?.total ?? 0,
    isLoading: isQueryValid && isLoading && data === undefined,
    isStale: isLoading,
    error: isQueryValid ? (error ?? null) : null,
    loadMore,
    hasMore: false,
    refetch: handleRefetch,
  };
}
