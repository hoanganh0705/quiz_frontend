/**
 * `features/admin/tag-admin/cache/tag-cache-keys.ts`
 *
 * Source epic:   Epic 7.3 — Tag admin CRUD + restore.
 * Source ticket: TKT-7.3.G1.
 *
 * ## Purpose
 *
 * Single source of truth for the SWR cache keys that every tag admin
 * mutation hook (`useCreateTag`, `useUpdateTag`, `useDeleteTag`,
 * `useRestoreTag`) invalidates on success. The keys cover:
 *
 *   - the admin list (active + soft-deleted) — see `TAG_ADMIN_LIST_KEY`
 *   - the Phase 3 public tag directory reads — see
 *     `PUBLIC_TAGS_DIRECTORY_KEY` (canonical string form of the base
 *     directory SWR key)
 *   - the per-slug Phase 3 detail reads — see `tagSlugKey(slug)`
 *
 * Every mutation hook imports the keys from here so the contract is
 * consistent across the four hooks. TKT-7.3.G2 builds on this file to
 * add cross-tab invalidation broadcasts.
 *
 * ## Tab-specific variants
 *
 * The admin list response is split client-side into `active` and
 * `softDeleted` arrays via `useTagAdminList`. The same SWR key serves
 * both tabs — the `tab` URL parameter is read by the list UI, not by
 * the SWR cache. Documenting this here keeps the contract tight
 * without introducing a second key that would risk drift between the
 * two caches.
 *
 * ## `invalidatePublicTagCaches` matcher semantics
 *
 * SWR's `mutate(matcher)` form accepts a function predicate that
 * iterates every cache entry and revalidates the matches. The matcher
 * in this file matches the prefix `tags:` so every Phase 3 public
 * read (`tags:directory:*`, `tags:slug:*`, `tags:related:*`,
 * `tags:quizzes:*`, `tags:analytics:*`, etc.) is swept by a single
 * mutation success.
 */

import { mutate as globalMutate, type ScopedMutator } from 'swr';

// ─── Admin list key ─────────────────────────────────────────────────────────

/**
 * Canonical SWR cache key for the admin tag list response.
 *
 * The response payload is split client-side into `active` and
 * `softDeleted` arrays by `useTagAdminList`; the URL `tab` parameter
 * selects which subset the UI renders. Both tabs read from the same
 * SWR cache entry, so there is no per-tab key — a single mutation
 * revalidates the shared entry and both tabs re-render.
 */
export const TAG_ADMIN_LIST_KEY = 'tag-admin:list' as const;

// ─── Public directory key ───────────────────────────────────────────────────

/**
 * Canonical SWR cache key for the public `tags:directory` reads.
 *
 * The `useTagsDirectory` hook (Phase 3 / Story 3.4) keys its SWR
 * reads with the array form `['tags', 'directory', ...]` for
 * filter + cursor pagination, and the per-slug hook uses
 * `['tag', slug]`. The matcher in `invalidatePublicTagCaches`
 * captures both forms via the shared `tags:` prefix so a single
 * mutation sweeps the entire public tag namespace.
 *
 * The string-form `PUBLIC_TAGS_DIRECTORY_KEY` is the canonical
 * invalidation target for the directory case; the matcher covers
 * the array-form keys.
 */
export const PUBLIC_TAGS_DIRECTORY_KEY = 'tags:directory' as const;

/**
 * SWR cache key prefix used by every public tag read hook. The
 * matcher in `invalidatePublicTagCaches` revalidates every entry
 * whose key starts with this prefix.
 */
export const PUBLIC_TAGS_PREFIX = 'tags:' as const;

// ─── Per-slug key ───────────────────────────────────────────────────────────

/**
 * Build the SWR cache key for the per-slug public detail read.
 *
 * `useTagBySlug` keys its SWR entry as `['tag', slug]`; the admin
 * mutation hooks broadcast a string-form prefix that the same
 * prefix-matcher captures. The string form `tags:slug:<slug>` is
 * the canonical string-form key the admin feature uses for invalidation.
 */
export function tagSlugKey(slug: string): string {
  return `tags:slug:${slug}`;
}

// ─── Invalidation helpers ───────────────────────────────────────────────────

/**
 * Revalidate the admin tag list SWR cache entry.
 *
 * Calls `mutate(TAG_ADMIN_LIST_KEY)`. The revalidation is
 * asynchronous; the helper returns the underlying promise so callers
 * can `await` it for consistency with the four mutation hooks
 * (TKT-7.3.C2–C5) which already `await` invalidation in the
 * success branch.
 *
 * @param mutate — optional `ScopedMutator` (defaults to the global
 *   SWR `mutate`). Tests inject a fake to assert call shape.
 */
export function invalidateTagAdminList(
  mutate: ScopedMutator = globalMutate,
): Promise<unknown> {
  return mutate(TAG_ADMIN_LIST_KEY) as Promise<unknown>;
}

/**
 * Predicate matched against each cache key. Returns `true` for every
 * entry whose key belongs to the public tag namespace — both the
 * string-form (`'tags:directory'`, `'tags:slug:foo'`, ...) and the
 * array-form (`['tags', 'directory', ...]`, `['tag', 'foo']`, ...)
 * variants used by the Phase 3 hooks.
 *
 * The array-form matcher treats any tuple whose first segment is
 * `'tags'` or `'tag'` as belonging to the public tag namespace. This
 * matches `useTagsDirectory` (`['tags', 'directory', ...]`) and
 * `useTagBySlug` (`['tag', slug]`).
 */
export function publicTagsKeyMatcher(key: unknown): boolean {
  if (typeof key === 'string') {
    return key.startsWith(PUBLIC_TAGS_PREFIX);
  }
  if (Array.isArray(key)) {
    const head = key[0];
    if (typeof head === 'string' && (head === 'tags' || head === 'tag')) {
      return true;
    }
    return key.some(
      (segment) =>
        typeof segment === 'string' && segment.startsWith(PUBLIC_TAGS_PREFIX),
    );
  }
  return false;
}

/**
 * Revalidate every public tag-related SWR cache entry.
 *
 * SWR's `mutate(matcher)` form accepts a function predicate that
 * iterates every cache entry and revalidates the matches. This
 * sweeps the Phase 3 public hooks' `tags:directory:*`,
 * `tags:slug:*`, `tags:related:*`, and any future Phase 3 / Phase 7
 * read paths that share the namespace.
 *
 * The matcher is intentionally prefix-based — the public hooks
 * evolve new key shapes (filter, cursor, etc.) and a single-prefix
 * matcher covers them without per-shape maintenance.
 *
 * @param mutate — optional `ScopedMutator` (defaults to the global
 *   SWR `mutate`). Tests inject a fake to assert call shape.
 */
export function invalidatePublicTagCaches(
  mutate: ScopedMutator = globalMutate,
): Promise<unknown[]> {
  return (mutate(publicTagsKeyMatcher) as unknown) as Promise<unknown[]>;
}
