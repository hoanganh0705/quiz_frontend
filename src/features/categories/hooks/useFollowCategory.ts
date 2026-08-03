'use client';

/**
 * `useFollowCategory` — the category-side "follow" action hook.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.B4.
 *
 * A thin wrapper around `useOptimisticToggle` (B1) that:
 *
 *   - calls `followCategory(id)` from the A2 wrapper
 *   - invalidates the `follow-lookup` SWR key (so the membership
 *     snapshot in `useFollowedLookup` refreshes on success / 404)
 *   - invalidates the category-detail key (so the page-level
 *     detail payload re-fetches and reflects the new follower state)
 *   - exposes `{ isPending, lastError, follow, unfollow }` shaped so
 *     the per-feature slot (B5) can render `<FollowButton />` (B2)
 *     with the right props
 *
 * The hook accepts `id: string | null` so the page can disable the
 * action while the route segment is still resolving the entity UUID.
 * When `id === null`, the hook returns no-op callbacks so the slot
 * never fires a follow against a not-yet-resolved entity.
 *
 * Drift (TKT-3.9.A1 §1.1): the wrapper is `followCategory(id)`
 * (singular). The planning doc named it `categoriesControllerFollowCategory`
 * (plural) — A2 §1.1 records the drift.
 *
 * @see useOptimisticToggle (B1)
 * @see followCategory (A2 wrapper)
 * @see CategoryFollowButtonSlot (B5)
 */

import { useCallback } from 'react';

import {
  type OptimisticToggleError,
  useOptimisticToggle,
} from '@/lib/api';
import { followedCategoriesKey } from '@/features/tags/hooks/useFollowedLookup';
import { followCategory } from '@/features/categories/services/categories.service';

export interface UseFollowCategoryResult {
  /**
   * `true` while the in-flight toggle is pending. The per-feature
   * slot (B5) wires this to `<FollowButton />`'s `isPending` prop.
   */
  isPending: boolean;
  /**
   * The latest error from a reverted toggle, or `null`. The slot
   * wires this to `<FollowButton />`'s `errorKind` prop (the
   * primitive maps the kind to the inline copy).
   */
  lastError: OptimisticToggleError | null;
  /**
   * Fire the follow action. The parent calls this from
   * `<FollowButton onToggle={follow} />`.
   */
  follow: () => Promise<void>;
  /**
   * The "currently not following" path's inverse — present on the
   * action surface so the slot can call `onToggle={isFollowing ? unfollow : follow}`.
   * For a `useFollowCategory` hook the user is presumed to NOT be
   * following, so this returns a no-op (the caller should switch to
   * `useUnfollowCategory` instead).
   */
  unfollow: () => Promise<void>;
}

const NOOP = async (): Promise<void> => {
  return;
};

export function useFollowCategory(
  id: string | null,
): UseFollowCategoryResult {
  // `useOptimisticToggle` is the foundational primitive — same
  // discipline as `useRevokeSession`. The hook owns the cooldown,
  // the rollback, and the SWR cache invalidation on success / 404.
  const keysToInvalidate = id
    ? ([
        followedCategoriesKey(),
        ['category', id],
      ] as const)
    : [];

  const { status, lastError, toggle } = useOptimisticToggle({
    currentValue: false,
    toggle: id
      ? () => followCategory(id)
      : () => Promise.resolve(),
    keysToInvalidate,
  });

  const follow = useCallback(async (): Promise<void> => {
    if (id === null) {
      return NOOP();
    }
    await toggle();
  }, [id, toggle]);

  return {
    isPending: status === 'pending',
    lastError,
    follow,
    unfollow: NOOP,
  };
}