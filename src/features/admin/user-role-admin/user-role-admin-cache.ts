

import { mutate as globalMutate } from 'swr';

export const USER_ROLE_ADMIN_PREFIX = 'user-role-admin';

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

await globalMutate(userRoleListKey(userId));

if (searchQuery) {
await globalMutate(userRoleAdminSearchKey(searchQuery));
  }
}
