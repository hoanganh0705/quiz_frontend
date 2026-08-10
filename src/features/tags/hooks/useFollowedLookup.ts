'use client';

/**
 * `useFollowedLookup` — SWR-backed lookup of the authenticated user's
 * followed categories + tags.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.B3.
 *
 * ## What this hook owns
 *
 *   - The single source-of-truth `Set<id>` membership read shared by
 *     every follow surface (category detail, tag detail, future
 *     directory "Following" badge) plus the per-feature action hooks
 *     in B4 (which call `mutate(...)` to invalidate after a toggle).
 *
 *   - A single-page snapshot of the first 500 entries of each
 *     `me/followed` endpoint. `useCursorPaginated` is intentionally
 *     NOT used here — the lookup is a `Set<id>` of membership, not a
 *     browsable feed. Story 3.9 line 1004 anticipates > 500 items as
 *     a future concern, deferred from Phase 3.
 *
 *   - The auth gate. When `useAuthState().isAuthenticated === false`,
 *     the hook short-circuits to the empty-set result without firing
 *     any fetch (the SWR keys include the auth state so the cache
 *     key is unique to the auth state).
 *
 * ## Why this hook lives under `features/tags/hooks/`
 *
 * The lookup is a user-scoped read shared by both categories and
 * tags. The cross-feature shared location mirrors how `useAuthState`
 * lives in `features/auth/` — every consumer imports from the
 * features barrel (`@/features/tags` for this hook) without reaching
 * into a separate "shared" folder. The category-side `useIsFollowing*`
 * hook (`src/features/categories/hooks/useIsFollowingCategory.ts`)
 * imports from `@/features/tags` for the lookup; the tag-side
 * `useIsFollowingTag` (`src/features/tags/hooks/useIsFollowingTag.ts`)
 * imports from this file.
 *
 * @see useIsFollowingCategory (B3)
 * @see useIsFollowingTag (B3)
 * @see useFollowCategory / useUnfollowCategory (B4)
 * @see useFollowTag / useUnfollowTag (B4)
 */

import useSWR from 'swr';

import { ApiError, isApiError } from '@/lib/api';
import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import { followedCategories } from '@/features/categories/services/categories.service';
import { followedTags } from '@/features/tags/services/tags.service';

/**
 * SWR key for the categories lookup. Stable across renders; the
 * `limit: 100` argument is captured into the key so a future caller
 * that requests a different page size does not collide with the
 * default-snapshot read.
 *
 * The backend (`/api/v1/users/me/followed-categories`) caps `limit`
 * at 100. We request the maximum so the in-memory `Set<id>` mirrors
 * "everything the user follows", even though no user is realistically
 * following >100 entities. If that cap is ever raised server-side,
 * bump this constant together with the backend `Max(100)` validator
 * — never independently.
 *
 * Exported so the per-feature action hooks (B4) can invalidate the
 * lookup after a successful toggle.
 */
export const FOLLOWED_LOOKUP_LIMIT = 100;

export const followedCategoriesKey = () =>
  ['follow-lookup', 'categories', { limit: FOLLOWED_LOOKUP_LIMIT }] as const;

export const followedTagsKey = () =>
  ['follow-lookup', 'tags', { limit: FOLLOWED_LOOKUP_LIMIT }] as const;

export interface UseFollowedLookupResult {
  /**
   * The set of category UUIDs the authenticated user follows. Empty
   * until the lookup hydrates (or until the auth gate permits a
   * fetch).
   */
  categories: ReadonlySet<string>;
  /**
   * The set of tag UUIDs the authenticated user follows. Empty until
   * the lookup hydrates (or until the auth gate permits a fetch).
   */
  tags: ReadonlySet<string>;
  /** `true` while at least one of the two fetches is in-flight. */
  isLoading: boolean;
  /** The first error from either fetch, surfaced for the page-level banner. */
  error: ApiError | null;
  /**
   * Invalidate both SWR keys at once. Called by the per-feature
   * action hooks (B4) on success / 404 to refresh the membership
   * snapshot.
   */
  mutate: () => Promise<void>;
}

function extractCategoryIds(
  page: Awaited<ReturnType<typeof followedCategories>> | undefined,
): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const item of page?.data ?? []) {
    if (item.categoryId) {
      ids.add(item.categoryId);
    }
  }
  return ids;
}

function extractTagIds(
  page: Awaited<ReturnType<typeof followedTags>> | undefined,
): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const item of page?.data ?? []) {
    if (item.tagId) {
      ids.add(item.tagId);
    }
  }
  return ids;
}

const NOOP = async (): Promise<void> => {
  return;
};

export function useFollowedLookup(): UseFollowedLookupResult {
  const { isAuthenticated } = useAuthState();

  // The SWR keys include the auth state. When unauthenticated, the
  // keys resolve to `null`, which SWR treats as "disable the fetch".
  // The result is the documented empty-set default.
  const categoriesKey = isAuthenticated ? followedCategoriesKey() : null;
  const tagsKey = isAuthenticated ? followedTagsKey() : null;

  // `revalidateOnFocus: true` overrides the global `false` for these
  // two keys so a returning user sees fresh state on focus (Story
  // 3.9 line 1002). Other SWR defaults are inherited from
  // `SwrProvider`.
  //
  // SWR's fetcher signature passes the SWR key as the first arg. The
  // params shape is captured into the key itself, so a key change
  // forces a refetch. The fetcher adapter calls the wrapper with the
  // single-page `FOLLOWED_LOOKUP_LIMIT` invariant.
  const categoriesFetcher = () =>
    followedCategories({ limit: FOLLOWED_LOOKUP_LIMIT });

  const tagsFetcher = () => followedTags({ limit: FOLLOWED_LOOKUP_LIMIT });

  const categoriesSwr = useSWR(categoriesKey, categoriesFetcher, {
    revalidateOnFocus: true,
  });
  const tagsSwr = useSWR(tagsKey, tagsFetcher, {
    revalidateOnFocus: true,
  });

  const categories = extractCategoryIds(categoriesSwr.data);
  const tags = extractTagIds(tagsSwr.data);

  const isLoading = categoriesSwr.isLoading || tagsSwr.isLoading;

  const error: ApiError | null = (() => {
    const first = categoriesSwr.error ?? tagsSwr.error;
    if (!first) return null;
    if (isApiError(first)) return first;
    // SWR surfaces the raw thrown value. A plain `Error` from a
    // test mock or a 401-from-fresh-state can land here; expose a
    // best-effort typed view so the consumer's `error !== null`
    // check works.
    if (first && typeof first === 'object' && 'status' in first) {
      return first as unknown as ApiError;
    }
    // The hook surfaces the raw value as an `ApiError` so the
    // consumer's `error !== null` check works. The value is wrapped
    // only when the consumer reads it (defensive; SWR only emits
    // typed errors when the custom-instance coerces them).
    return {
      status: 0,
      message: first instanceof Error ? first.message : String(first),
    } as unknown as ApiError;
  })();

  const mutate = async (): Promise<void> => {
    if (!isAuthenticated) {
      return NOOP();
    }
    await Promise.all([
      categoriesSwr.mutate(),
      tagsSwr.mutate(),
    ]);
  };

  return {
    categories,
    tags,
    isLoading,
    error,
    mutate,
  };
}