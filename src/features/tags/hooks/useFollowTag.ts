'use client';

/**
 * `useFollowTag` — the tag-side "follow" action hook.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.B4.
 *
 * Mirror of `useFollowCategory` — a thin wrapper around
 * `useOptimisticToggle` (B1) that:
 *
 *   - calls `followTag(id)` from the A2 wrapper
 *   - invalidates the `follow-lookup` tags SWR key + the tag-detail
 *     key (so the membership snapshot and the detail payload refresh)
 *   - exposes `{ isPending, lastError, follow, unfollow }` for the
 *     per-feature slot (B5) to wire to `<FollowButton />` (B2)
 *
 * The hook accepts `id: string | null` so the page can disable the
 * action while the route segment is still resolving the entity UUID.
 *
 * @see useOptimisticToggle (B1)
 * @see followTag (A2 wrapper)
 * @see TagFollowButtonSlot (B5)
 */

import { useCallback } from 'react';

import {
  type OptimisticToggleError,
  useOptimisticToggle,
} from '@/lib/api';
import { followedTagsKey } from '@/features/tags/hooks/useFollowedLookup';
import { followTag } from '@/features/tags/wrappers/tag.wrapper';

export interface UseFollowTagResult {
  isPending: boolean;
  lastError: OptimisticToggleError | null;
  follow: () => Promise<void>;
  unfollow: () => Promise<void>;
}

const NOOP = async (): Promise<void> => {
  return;
};

export function useFollowTag(id: string | null): UseFollowTagResult {
  const keysToInvalidate = id
    ? ([
        followedTagsKey(),
        ['tag', id],
      ] as const)
    : [];

  const { status, lastError, toggle } = useOptimisticToggle({
    currentValue: false,
    toggle: id
      ? () => followTag(id)
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