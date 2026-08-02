'use client';

/**
 * `<TagFollowButtonSlot />` — the per-feature composition that
 * wires `useIsFollowingTag` + `useFollowTag` + `useUnfollowTag`
 * (B3 + B4) to the `<FollowButton />` primitive (B2) for the tag
 * detail surface.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.B5 (slot composition); TKT-3.9.D1 (follow count).
 *
 * Mirror of `<CategoryFollowButtonSlot />` (categories side) — the
 * per-feature composition that wires the membership check + action
 * hooks to the shared primitive.
 *
 * ## What this slot owns
 *
 *   - The auth + membership + action hook composition:
 *       `useAuthState()` (auth gate)
 *       `useIsFollowingTag(tagId)` (membership check, B3)
 *       `useFollowTag(tagId)` (action, B4)
 *       `useUnfollowTag(tagId)` (action, B4)
 *       `useFollowedLookup()` (count source, B3 — D1)
 *
 *   - The three render branches:
 *       (1) `tagId === null` → `null`
 *       (2) `useIsFollowing*().isLoading === true` → `<FollowButtonSkeleton />`
 *       (3) otherwise → `<FollowButton />` + the optimistic follow
 *           count (`<span data-testid='follow-count'>{N} follower{s}</span>`)
 *
 * ## What this slot does NOT own
 *
 *   - The layout / positioning beside `<TagHeader />` — the page
 *     composition (C2) wraps the slot in a flex container.
 *   - The `<FollowErrorNotice />` rendering — the B2 primitive owns
 *     that via the `errorKind` prop.
 *   - The SWR cache mutation on success / rollback — the
 *     `useOptimisticToggle` primitive (B1) via B4 owns it.
 *   - Sentry / `captureException` — errors are surfaced via
 *     `<FollowErrorNotice />`; no logging side-effects in the slot.
 *
 * The slot accepts `tagId` (not the route slug — A1 §7 records the
 * drift). The page passes the resolved entity UUID from the detail
 * hook's payload.
 */

import { useCallback } from 'react';

import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import {
  FollowButton,
  FollowButtonSkeleton,
  type FollowButtonProps,
} from '@/components/primitives';
import { useFollowedLookup } from '@/features/tags';
import { useIsFollowingTag } from '@/features/tags/hooks/useIsFollowingTag';
import { useFollowTag } from '@/features/tags/hooks/useFollowTag';
import { useUnfollowTag } from '@/features/tags/hooks/useUnfollowTag';
import { cn } from '@/shared/utils/merge-class-names';

export interface TagFollowButtonSlotProps {
  /**
   * The resolved tag entity UUID from the detail hook's payload
   * (`tag.tagId`). The page does NOT pass the route slug — A1 §7
   * records the drift. `null` is the loading / not-yet-resolved
   * state; the slot renders `null` in that case (B5 AC #3).
   */
  tagId: string | null;
  /** Optional className applied to the outer wrapper. */
  className?: string;
}

export function TagFollowButtonSlot({
  tagId,
  className,
}: TagFollowButtonSlotProps): React.ReactElement | null {
  const { isAuthenticated } = useAuthState();

  // Membership check — the B3 hook. When `tagId === null` the hook
  // returns `{ isFollowing: false, isLoading: false }`.
  const { isFollowing, isLoading } = useIsFollowingTag(tagId);

  // Follow-count source — D1. `useFollowedLookup` exposes the user's
  // total followed-tag count via `tags.size`. The lookup is the
  // source of truth for "how many things this user follows"; a
  // per-entity follower-count is NOT available on the wire (A1 §11).
  const { tags: followedTags, isLoading: isLookupLoading } =
    useFollowedLookup();
  const followCount = followedTags.size;

  // Action surface — B4. When `tagId === null` both hooks return
  // `{ follow: noop, unfollow: noop }`; when non-null the `follow`
  // callback from `useFollowTag` and the `unfollow` callback from
  // `useUnfollowTag` are wired to the action hooks' optimistic-toggle
  // primitives.
  const { isPending: isFollowPending, lastError: followError, follow } =
    useFollowTag(tagId);
  const {
    isPending: isUnfollowPending,
    lastError: unfollowError,
    unfollow,
  } = useUnfollowTag(tagId);

  // Coalesce pending state — only one of follow / unfollow can be
  // in-flight at a time (the B2 primitive disables the button during
  // pending).
  const isPending = isFollowPending || isUnfollowPending;

  // Coalesce lastError — both hooks share the
  // `OptimisticToggleError | null` shape; the slot forwards the
  // kind to the primitive.
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

  // Branch 1 — `tagId === null` (the route segment is still
  // resolving). Render `null` so the slot does not introduce CLS
  // before the entity UUID exists (B5 AC #3).
  if (tagId === null) {
    return null;
  }

  // Branch 2 — membership lookup is hydrating. Render the skeleton
  // (B2) so the resolved button's outer dimensions are preserved
  // (CLS = 0 — Story 3.9 line 983). B5 AC #4. The follow-count
  // row is omitted during hydration (D1 AC #3).
  if (isLoading) {
    return (
      <div
        data-testid='tag-follow-button-slot'
        data-state='loading'
        className={cn('flex flex-col items-start', className)}
      >
        <FollowButtonSkeleton />
      </div>
    );
  }

  // Branch 3 — resolved state. Render the B2 primitive + the
  // follow-count row (D1).
  return (
    <div
      data-testid='tag-follow-button-slot'
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