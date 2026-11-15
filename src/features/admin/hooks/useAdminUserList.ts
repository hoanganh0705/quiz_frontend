'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';

import {
  listAdminUsers,
  createAdminUser,
  updateAdminUserRole,
  deleteAdminUser,
  type AdminUserDto,
  type AdminUserQuery,
  type CreateAdminUserInput,
} from '../services/user-admin.service';

export function useAdminUserList(initialQuery: AdminUserQuery = {}) {
  const [query, setQuery] = useState<AdminUserQuery>({
    page: 1,
    limit: 20,
    ...initialQuery,
  });

  const swrKey = ['admin', 'users', query.page, query.limit, query.search, query.role, query.isVerified, query.sortBy, query.sortOrder];

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    swrKey,
    () => listAdminUsers(query),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  );

  const setPage = useCallback((page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setQuery((prev) => ({ ...prev, search: search.trim() || undefined, page: 1 }));
  }, []);

  const setRole = useCallback((role: 'user' | 'moderator' | 'admin' | undefined) => {
    setQuery((prev) => ({ ...prev, role, page: 1 }));
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
    async (userId: string, role: 'user' | 'moderator' | 'admin') => {
      const updated = await updateAdminUserRole(userId, role);
      await mutate();
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

  return {
    users: data?.data ?? ([] as AdminUserDto[]),
    pagination: data?.meta?.pagination,
    isLoading,
    isValidating,
    error: error as Error | null,
    query,
    setPage,
    setSearch,
    setRole,
    setQuery,
    createUser,
    updateRole,
    removeUser,
    refresh: mutate,
  };
}
