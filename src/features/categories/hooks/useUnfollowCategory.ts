'use client';

/**
 * `useUnfollowCategory` — the category-side "unfollow" action hook.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.B4.
 *
 * A thin wrapper around `useOptimisticToggle` (B1) that:
 *
 *   - calls `unfollowCategory(id)` from the A2 wrapper
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
 * never fires an unfollow against a not-yet-resolved entity.
 *
 * Mirror of `useFollowCategory` — the slot (B5) reads both hooks and
 * dispatches the right one based on the current `isFollowing` state.
 *
 * @see useOptimisticToggle (B1)
 * @see unfollowCategory (A2 wrapper)
 * @see CategoryFollowButtonSlot (B5)
 */

import { useCallback } from 'react';

import {
  type OptimisticToggleError,
  useOptimisticToggle,
} from '@/lib/api';
import { followedCategoriesKey } from '@/features/tags/hooks/useFollowedLookup';
import { unfollowCategory } from '@/features/categories/wrappers/category.wrapper';

export interface UseUnfollowCategoryResult {
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
   * The "currently following" path's inverse — present on the
   * action surface so the slot can call
   * `onToggle={isFollowing ? unfollow : follow}`. For a
   * `useUnfollowCategory` hook the user is presumed to be
   * following, so `follow` returns a no-op (the caller should
   * switch to `useFollowCategory` instead).
   */
  follow: () => Promise<void>;
  /**
   * Fire the unfollow action. The parent calls this from
   * `<FollowButton onToggle={unfollow} />`.
   */
  unfollow: () => Promise<void>;
}

const NOOP = async (): Promise<void> => {
  return;
};

export function useUnfollowCategory(
  id: string | null,
): UseUnfollowCategoryResult {
  const keysToInvalidate = id
    ? ([
        followedCategoriesKey(),
        ['category', id],
      ] as const)
    : [];

  const { status, lastError, toggle } = useOptimisticToggle({
    currentValue: true,
    toggle: id
      ? () => unfollowCategory(id)
      : () => Promise.resolve(),
    keysToInvalidate,
  });

  const unfollow = useCallback(async (): Promise<void> => {
    if (id === null) {
      return NOOP();
    }
    await toggle();
  }, [id, toggle]);

  return {
    isPending: status === 'pending',
    lastError,
    follow: NOOP,
    unfollow,
  };
}