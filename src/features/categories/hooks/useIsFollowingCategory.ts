'use client';

/**
 * `useIsFollowingCategory` — the category-side membership check for
 * the authenticated user.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.B3.
 *
 * Consumes `useFollowedLookup` from `@/features/tags` (the shared
 * `Set<id>` snapshot — the cross-feature shared location mirrors
 * how `useAuthState` lives in `features/auth/`). Exposes a small
 * two-field surface the per-feature slot (B5) can read to render
 * `<FollowButton />` (B2) in the correct state.
 *
 * The hook accepts `id: string | null` so the page can disable the
 * fetch while the route segment is still resolving the entity
 * UUID. When `id === null`, the hook returns
 * `{ isFollowing: false, isLoading: false }` so the parent does not
 * flash the "following" state for a not-yet-resolved entity.
 *
 * The hook deliberately does NOT own the action side
 * (`useFollowCategory` / `useUnfollowCategory`, B4) — the slot
 * composition reads from this hook AND calls B4's action hooks,
 * mirroring the `useRevokeSession` / `useActiveSessions` precedent
 * (action hook + list hook, separate files).
 *
 * @see useFollowedLookup (B3 — the shared lookup)
 * @see useFollowCategory / useUnfollowCategory (B4 — the action hooks)
 * @see CategoryFollowButtonSlot (B5 — the per-feature slot composition)
 */

import { useFollowedLookup } from '@/features/tags';

export interface UseIsFollowingCategoryResult {
  /**
   * `true` when the authenticated user follows the category with
   * the given `id`. `false` when the user is unauthenticated or the
   * lookup has not yet hydrated.
   */
  isFollowing: boolean;
  /**
   * `true` while `useFollowedLookup` is hydrating. The per-feature
   * slot (B5) reads this to render `<FollowButtonSkeleton />` (B2)
   * during the hydration window so the slot introduces zero CLS.
   */
  isLoading: boolean;
}

export function useIsFollowingCategory(
  id: string | null,
): UseIsFollowingCategoryResult {
  const lookup = useFollowedLookup();

  if (id === null) {
    return { isFollowing: false, isLoading: false };
  }

  return {
    isFollowing: lookup.categories.has(id),
    isLoading: lookup.isLoading,
  };
}