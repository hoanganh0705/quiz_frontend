'use client';

/**
 * `useUnfollowTag` — the tag-side "unfollow" action hook.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.B4.
 *
 * Mirror of `useUnfollowCategory`. Thin wrapper around
 * `useOptimisticToggle` (B1) that:
 *
 *   - calls `unfollowTag(id)` from the A2 wrapper
 *   - invalidates the `follow-lookup` tags SWR key + the tag-detail
 *     key
 *   - exposes `{ isPending, lastError, follow, unfollow }` for the
 *     per-feature slot (B5) to wire to `<FollowButton />` (B2)
 *
 * The hook accepts `id: string | null` so the page can disable the
 * action while the route segment is still resolving the entity UUID.
 *
 * @see useOptimisticToggle (B1)
 * @see unfollowTag (A2 wrapper)
 * @see TagFollowButtonSlot (B5)
 */

import { useCallback } from 'react';

import {
  type OptimisticToggleError,
  useOptimisticToggle,
} from '@/lib/api';
import { followedTagsKey } from '@/features/tags/hooks/useFollowedLookup';
import { unfollowTag } from '@/features/tags/services/tags.service';

export interface UseUnfollowTagResult {
  isPending: boolean;
  lastError: OptimisticToggleError | null;
  follow: () => Promise<void>;
  unfollow: () => Promise<void>;
}

const NOOP = async (): Promise<void> => {
  return;
};

export function useUnfollowTag(id: string | null): UseUnfollowTagResult {
  const keysToInvalidate = id
    ? ([
        followedTagsKey(),
        ['tag', id],
      ] as const)
    : [];

  const { status, lastError, toggle } = useOptimisticToggle({
    currentValue: true,
    toggle: id
      ? () => unfollowTag(id)
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