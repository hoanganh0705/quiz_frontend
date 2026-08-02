'use client';

/**
 * `<CategoryFollowButtonSlot />` — the per-feature composition that
 * wires `useIsFollowingCategory` + `useFollowCategory` +
 * `useUnfollowCategory` (B3 + B4) to the `<FollowButton />` primitive
 * (B2) for the category detail surface.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.B5 (slot composition); TKT-3.9.D1 (follow count).
 *
 * ## What this slot owns
 *
 *   - The auth + membership + action hook composition:
 *       `useAuthState()` (auth gate)
 *       `useIsFollowingCategory(categoryId)` (membership check, B3)
 *       `useFollowCategory(categoryId)` (action, B4)
 *       `useUnfollowCategory(categoryId)` (action, B4)
 *       `useFollowedLookup()` (count source, B3 — D1)
 *
 *   - The three render branches:
 *       (1) `categoryId === null` → `null` (the page disables the
 *           fetch while the route segment is still resolving)
 *       (2) `useIsFollowing*().isLoading === true` → `<FollowButtonSkeleton />`
 *           (the placeholder mirrors the resolved button — CLS = 0)
 *       (3) otherwise → `<FollowButton />` + the optimistic follow
 *           count (`<span data-testid='follow-count'>{N} follower{s}</span>`)
 *
 *   - The follow count rendering (D1). The count is derived from
 *     `useFollowedLookup().categories.size` (the user's total
 *     followed-category count — NOT the per-entity count; the wire
 *     does not expose a per-entity follower count). The count updates
 *     optimistically via the existing `useOptimisticToggle` cache
 *     invalidation in B4 (the `keysToInvalidate` entry on the
 *     `follow-lookup` SWR key forces a refetch on success / 404).
 *     On rollback, the cache is rolled back by the `useOptimisticToggle`
 *     primitive — the lookup size reverts to its prior value.
 *
 * ## What this slot does NOT own
 *
 *   - The layout / positioning beside `<CategoryHeader />` — the
 *     page composition (C1) wraps the slot in a flex container.
 *   - The `<FollowErrorNotice />` rendering — the B2 primitive owns
 *     that via the `errorKind` prop.
 *   - The SWR cache mutation on success / rollback — the
 *     `useOptimisticToggle` primitive (B1) via B4 owns it.
 *   - Sentry / `captureException` — errors are surfaced via
 *     `<FollowErrorNotice />`; no logging side-effects in the slot.
 *
 * The slot accepts `categoryId` (not the route slug — A1 §7 records
 * the drift). The page passes the resolved entity UUID from the
 * detail hook's payload.
 */

import { useCallback } from 'react';

import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import {
  FollowButton,
  FollowButtonSkeleton,
  type FollowButtonProps,
} from '@/components/primitives';
import { useFollowedLookup } from '@/features/tags';
import { useIsFollowingCategory } from '@/features/categories/hooks/useIsFollowingCategory';
import { useFollowCategory } from '@/features/categories/hooks/useFollowCategory';
import { useUnfollowCategory } from '@/features/categories/hooks/useUnfollowCategory';
import { cn } from '@/shared/utils/merge-class-names';

export interface CategoryFollowButtonSlotProps {
  /**
   * The resolved category entity UUID from the detail hook's payload
   * (`category.categoryId`). The page does NOT pass the route slug
   * — A1 §7 records the drift. `null` is the loading / not-yet-resolved
   * state; the slot renders `null` in that case (B5 AC #3).
   */
  categoryId: string | null;
  /** Optional className applied to the outer wrapper. */
  className?: string;
}

export function CategoryFollowButtonSlot({
  categoryId,
  className,
}: CategoryFollowButtonSlotProps): React.ReactElement | null {
  const { isAuthenticated } = useAuthState();

  // Membership check — the B3 hook. When `categoryId === null` the
  // hook returns `{ isFollowing: false, isLoading: false }`.
  const { isFollowing, isLoading } = useIsFollowingCategory(categoryId);

  // Follow-count source — D1. `useFollowedLookup` exposes the user's
  // total followed-category count via `categories.size`. The lookup
  // is the source of truth for "how many things this user follows";
  // a per-entity follower-count is NOT available on the wire (A1 §11).
  const { categories: followedCategories, isLoading: isLookupLoading } =
    useFollowedLookup();
  const followCount = followedCategories.size;

  // Action surface — B4. When `categoryId === null` both hooks
  // return `{ follow: noop, unfollow: noop }`; when non-null the
  // `follow` callback from `useFollowCategory` and the `unfollow`
  // callback from `useUnfollowCategory` are wired to the action
  // hooks' optimistic-toggle primitives.
  const { isPending: isFollowPending, lastError: followError, follow } =
    useFollowCategory(categoryId);
  const {
    isPending: isUnfollowPending,
    lastError: unfollowError,
    unfollow,
  } = useUnfollowCategory(categoryId);

  // The optimistic-toggle primitive surfaces `pending` from whichever
  // action was last invoked. Both action hooks share the same
  // `useOptimisticToggle` semantics — coalesce by `OR` (only one can
  // be in-flight at a time; the slot disables both via the
  // `<FollowButton />` primitive's pending branch).
  const isPending = isFollowPending || isUnfollowPending;

  // `lastError` likewise — coalesce to the most recent error. Both
  // hooks share the `OptimisticToggleError | null` shape; the slot
  // forwards the kind to the primitive.
  const lastError = followError ?? unfollowError;

  // Stable click handler — `useCallback` so the B2 primitive does
  // not re-render on every parent render. B5 AC #6.
  const handleToggle = useCallback<FollowButtonProps['onToggle']>(() => {
    if (isFollowing) {
      void unfollow();
    } else {
      void follow();
    }
  }, [isFollowing, follow, unfollow]);

  // Branch 1 — `categoryId === null` (the route segment is still
  // resolving). Render `null` so the slot does not introduce CLS
  // before the entity UUID exists (B5 AC #3).
  if (categoryId === null) {
    return null;
  }

  // Branch 2 — membership lookup is hydrating. Render the skeleton
  // (B2) so the resolved button's outer dimensions are preserved
  // (CLS = 0 — Story 3.9 line 983). B5 AC #4. The follow-count
  // row is omitted during hydration (D1 AC #3) — only the skeleton
  // placeholder occupies the slot's outer chrome.
  if (isLoading) {
    return (
      <div
        data-testid='category-follow-button-slot'
        data-state='loading'
        className={cn('flex flex-col items-start', className)}
      >
        <FollowButtonSkeleton />
      </div>
    );
  }

  // Branch 3 — resolved state. Render the B2 primitive + the
  // follow-count row (D1).
  //
  // The count is rendered inside the slot's existing flex column
  // wrapper, immediately below the button, so the count occupies
  // the same DOM region as the button + its skeleton — no CLS.
  return (
    <div
      data-testid='category-follow-button-slot'
      data-state='resolved'
      data-following={isFollowing ? 'true' : 'false'}
      className={cn('flex flex-col items-start', className)}
    >
      <FollowButton
        isFollowing={isFollowing}
        isAuthenticated={isAuthenticated}
        isPending={isPending}
        errorKind={lastError?.kind ?? null}
        onToggle={handleToggle}
      />
      <span
        data-testid='follow-count'
        data-count={String(followCount)}
        data-loading={isLookupLoading ? 'true' : 'false'}
        className='mt-1 text-xs text-muted-foreground tabular-nums'
      >
        {`${followCount} follower${followCount === 1 ? '' : 's'}`}
      </span>
    </div>
  );
}