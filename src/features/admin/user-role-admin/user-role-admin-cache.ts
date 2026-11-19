"use client";

import { getQueryClient } from "@/providers/QueryProvider";

export const USER_ROLE_ADMIN_PREFIX = "user-role-admin";

export function userRoleListKey(userId: string): string {
  return `${USER_ROLE_ADMIN_PREFIX}:user-roles:${userId}`;
}

export function userRoleAdminSearchKey(query: string): string {
  return `${USER_ROLE_ADMIN_PREFIX}:search:${query}`;
}

export async function invalidateUserRoleCache(
  userId: string,
  searchQuery?: string,
): Promise<void> {
  const qc = getQueryClient();
  const invalidations: Promise<void>[] = [
    qc.invalidateQueries({ queryKey: [userRoleListKey(userId)] }),
  ];
  if (searchQuery) {
    invalidations.push(
      qc.invalidateQueries({
        queryKey: [userRoleAdminSearchKey(searchQuery)],
      }),
    );
  }
  await Promise.all(invalidations);
}
