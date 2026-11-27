"use client";

import { useCallback, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { getQueryClient } from "@/providers/QueryProvider";

import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  updateAdminUserRole,
} from "../services/user-admin.service";
import {
  ADMIN_USERS_LIST_KEY,
  userRoleListKey,
} from "../user-role-admin/user-role-admin-cache";

import type {
  AdminUserQuery,
  CreateAdminUserInput,
} from "../services/user-admin.service";

export function useAdminUserList(initialQuery: AdminUserQuery = {}) {
  const [query, setQuery] = useState<AdminUserQuery>({
    page: 1,
    limit: 20,
    ...initialQuery,
  });

  const queryKey = [
    "admin",
    "users",
    query.page,
    query.limit,
    query.search,
    query.role,
    query.isVerified,
    query.sortBy,
    query.sortOrder,
  ] as const;

  const { data, error, isLoading, isFetching, refetch } = useQuery(
    {
      queryKey,
      queryFn: () => listAdminUsers(query),
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
    getQueryClient(),
  );

  const setPage = useCallback((page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setQuery((prev) => ({
      ...prev,
      search: search.trim() || undefined,
      page: 1,
    }));
  }, []);

  const setRole = useCallback(
    (role: "user" | "moderator" | "admin" | undefined) => {
      setQuery((prev) => ({ ...prev, role, page: 1 }));
    },
    [],
  );

  const mutate = useCallback(async () => {
    const qc = getQueryClient();
    await qc.invalidateQueries({ queryKey: ADMIN_USERS_LIST_KEY });
  }, []);

  const createUser = useCallback(
    async (input: CreateAdminUserInput) => {
      const created = await createAdminUser(input);
      await mutate();
      return created;
    },
    [mutate],
  );

  const updateRole = useCallback(
    async (userId: string, role: "user" | "moderator" | "admin") => {
      const updated = await updateAdminUserRole(userId, role);
      const qc = getQueryClient();
      await Promise.all([
        mutate(),
        qc.invalidateQueries({ queryKey: [userRoleListKey(userId)] }),
      ]);
      return updated;
    },
    [mutate],
  );

  const removeUser = useCallback(
    async (userId: string) => {
      const res = await deleteAdminUser(userId);
      await mutate();
      return res;
    },
    [mutate],
  );

  const pagination = {
    page: query.page ?? 1,
    limit: query.limit ?? 20,
    total: data?.meta?.pagination?.total ?? 0,
    totalPages: data?.meta?.pagination
      ? Math.ceil(data.meta.pagination.total / data.meta.pagination.limit)
      : 1,
    hasMore: data?.meta?.pagination?.hasMore ?? false,
  };

  return {
    users: data?.data ?? [],
    total: data?.meta?.pagination?.total ?? 0,
    page: query.page ?? 1,
    limit: query.limit ?? 20,
    totalPages: data?.meta?.pagination
      ? Math.ceil(data.meta.pagination.total / data.meta.pagination.limit)
      : 1,
    pagination,
    query,
    isLoading: isLoading && data === undefined,
    isValidating: isFetching,
    error: error ?? null,
    setPage,
    setSearch,
    setRole,
    createUser,
    updateRole,
    removeUser,
    refresh: () => mutate(),
  };
}
