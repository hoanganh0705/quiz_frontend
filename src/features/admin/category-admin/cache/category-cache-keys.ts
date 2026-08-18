

import { mutate as globalMutate, type ScopedMutator } from 'swr';

export const CATEGORY_ADMIN_LIST_KEY = 'category-admin:list' as const;

export const PUBLIC_CATEGORIES_DIRECTORY_KEY = 'categories:directory' as const;

export const PUBLIC_CATEGORIES_PREFIX = 'categories:' as const;

export function categorySlugKey(slug: string): string {
return `categories:slug:${slug}`;
}

export function invalidateCategoryAdminList(
mutate: ScopedMutator = globalMutate,
): Promise<unknown> {
return mutate(CATEGORY_ADMIN_LIST_KEY) as Promise<unknown>;
}

export function publicCategoriesKeyMatcher(key: unknown): boolean {
if (typeof key === 'string') {
return key.startsWith(PUBLIC_CATEGORIES_PREFIX);
  }
if (Array.isArray(key)) {
const head = key[0];
if (
typeof head === 'string' &&
(head === 'categories' || head === 'category')
    ) {
return true;
    }
return key.some(
(segment) =>
typeof segment === 'string' &&
segment.startsWith(PUBLIC_CATEGORIES_PREFIX),
    );
  }
return false;
}

export function invalidatePublicCategoryCaches(
mutate: ScopedMutator = globalMutate,
): Promise<unknown[]> {
return (mutate(publicCategoriesKeyMatcher) as unknown) as Promise<unknown[]>;
}