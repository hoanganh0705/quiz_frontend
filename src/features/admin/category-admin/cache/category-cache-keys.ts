/**
 * `features/admin/category-admin/cache/category-cache-keys.ts`
 *
 * Source epic:   Epic 7.4 — Category admin CRUD + restore.
 * Source ticket: TKT-7.4.G1 (analogous to TKT-7.3.G1).
 *
 * ## Purpose
 *
 * Single source of truth for the SWR cache keys that every category
 * admin mutation hook (`useCreateCategory`, `useUpdateCategory`,
 * `useDeleteCategory`, `useRestoreCategory`) invalidates on success.
 * The keys cover:
 *
 *   - the admin list (active + soft-deleted) — `CATEGORY_ADMIN_LIST_KEY`
 *   - the Phase 3 public category directory reads — `PUBLIC_CATEGORIES_DIRECTORY_KEY`
 *   - the per-slug Phase 3 detail reads — `categorySlugKey(slug)`
 *
 * Every mutation hook imports the keys from here so the contract is
 * consistent across the four hooks.
 *
 * Mirrors `tag-cache-keys.ts` (TKT-7.3.G1).
 */

import { mutate as globalMutate, type ScopedMutator } from 'swr';

// ─── Admin list key ─────────────────────────────────────────────────────────

/**
 * Canonical SWR cache key for the admin category list response.
 *
 * The response payload is split client-side into `active` and
 * `softDeleted` arrays via `useCategoryAdminList`; the URL `tab`
 * parameter selects which subset the UI renders. Both tabs read from
 * the same SWR cache entry, so there is no per-tab key — a single
 * mutation revalidates the shared entry and both tabs re-render.
 */
export const CATEGORY_ADMIN_LIST_KEY = 'category-admin:list' as const;

// ─── Public directory key ───────────────────────────────────────────────────

/**
 * Canonical SWR cache key for the public `categories:directory` reads.
 *
 * The matcher in `invalidatePublicCategoryCaches` captures both the
 * string-form and array-form keys via the shared `categories:` prefix
 * so a single mutation sweeps the entire public category namespace.
 */
export const PUBLIC_CATEGORIES_DIRECTORY_KEY = 'categories:directory' as const;

/**
 * SWR cache key prefix used by every public category read hook. The
 * matcher in `invalidatePublicCategoryCaches` revalidates every entry
 * whose key starts with this prefix.
 */
export const PUBLIC_CATEGORIES_PREFIX = 'categories:' as const;

// ─── Per-slug key ───────────────────────────────────────────────────────────

/**
 * Build the SWR cache key for the per-slug public detail read.
 *
 * `useCategoryBySlug` keys its SWR entry as `['category', slug]`; the
 * admin mutation hooks broadcast a string-form prefix that the same
 * prefix-matcher captures. The string form `categories:slug:<slug>`
 * is the canonical string-form key the admin feature uses for
 * invalidation.
 */
export function categorySlugKey(slug: string): string {
  return `categories:slug:${slug}`;
}

// ─── Invalidation helpers ───────────────────────────────────────────────────

/**
 * Revalidate the admin category list SWR cache entry.
 *
 * Calls `mutate(CATEGORY_ADMIN_LIST_KEY)`. The revalidation is
 * asynchronous; the helper returns the underlying promise so callers
 * can `await` it for consistency with the four mutation hooks.
 *
 * @param mutate — optional `ScopedMutator` (defaults to the global
 *   SWR `mutate`). Tests inject a fake to assert call shape.
 */
export function invalidateCategoryAdminList(
  mutate: ScopedMutator = globalMutate,
): Promise<unknown> {
  return mutate(CATEGORY_ADMIN_LIST_KEY) as Promise<unknown>;
}

/**
 * Predicate matched against each cache key. Returns `true` for every
 * entry whose key belongs to the public category namespace — both the
 * string-form (`'categories:directory'`, `'categories:slug:foo'`, ...)
 * and the array-form (`['categories', 'directory', ...]`,
 * `['category', 'foo']`, ...) variants used by the Phase 3 hooks.
 */
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

/**
 * Revalidate every public category-related SWR cache entry.
 *
 * SWR's `mutate(matcher)` form accepts a function predicate that
 * iterates every cache entry and revalidates the matches. This
 * sweeps the Phase 3 public hooks' `categories:directory:*`,
 * `categories:slug:*`, and any future Phase 3 / Phase 7 read paths
 * that share the namespace.
 *
 * @param mutate — optional `ScopedMutator` (defaults to the global
 *   SWR `mutate`). Tests inject a fake to assert call shape.
 */
export function invalidatePublicCategoryCaches(
  mutate: ScopedMutator = globalMutate,
): Promise<unknown[]> {
  return (mutate(publicCategoriesKeyMatcher) as unknown) as Promise<unknown[]>;
}