/**
 * `features/admin/user-role-admin/user-role-admin-cache.ts`
 *
 * Source epic:   Epic 7.10 — User Role Grant: USER_GRANT_ROLE with Secondary Confirm.
 * Source ticket: TKT-7.10.B3.
 *
 * ## What this module owns
 *
 * The SWR cache key convention and invalidation helpers for user role admin.
 * This module provides a stable namespace for cache keys and the invalidation
 * helper used after grant/revoke mutations.
 */

import { mutate as globalMutate } from 'swr';

export const USER_ROLE_ADMIN_PREFIX = 'user-role-admin';

/**
 * Generate the cache key for a specific user's role list.
 */
export function userRoleListKey(userId: string): string {
  return `${USER_ROLE_ADMIN_PREFIX}:user-roles:${userId}`;
}

/**
 * Generate the cache key for user search results.
 */
export function userRoleAdminSearchKey(query: string): string {
  return `${USER_ROLE_ADMIN_PREFIX}:search:${query}`;
}

/**
 * Invalidate the user role cache for a specific user.
 *
 * This helper invalidates the user's role list cache. It also invalidates
 * the user search cache if the grant/revoke changes search visibility
 * (e.g., target gains admin role and appears in admin-only search results).
 *
 * @param userId - The target user's ID
 * @param searchQuery - Optional search query to invalidate search cache
 */
export async function invalidateUserRoleCache(
  userId: string,
  searchQuery?: string,
): Promise<void> {
  // Always invalidate the user's role list
  await globalMutate(userRoleListKey(userId));

  // If a search query is provided, also invalidate the search cache
  // since the user's roles may have changed and affect search results
  if (searchQuery) {
    await globalMutate(userRoleAdminSearchKey(searchQuery));
  }
}
