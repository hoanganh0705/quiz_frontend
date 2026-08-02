/**
 * `<FollowButtonSkeleton />` — loading-state placeholder for
 * `<FollowButton />`.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.B2.
 *
 * The skeleton is rendered by the per-feature slot (B5) while
 * `useIsFollowingCategory` / `useIsFollowingTag` (B3) is hydrating.
 * The skeleton's outer dimensions mirror `<FollowButton />` so the
 * swap does NOT introduce CLS (Story 3.9 line 983 — CLS = 0 invariant
 * on the follow slot).
 *
 * The skeleton's outer chrome is a single shadcn `Skeleton` block
 * with `h-9 min-w-28 px-4` to match the FollowButton's button
 * dimensions. The flex column wrapper above is omitted (the slot
 * owns the wrapper, so the skeleton only fills the button slot).
 */

import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/shared/utils/merge-class-names';

const OUTER = 'inline-flex h-9 min-w-28 items-center gap-1.5 px-4 rounded-md'

export interface FollowButtonSkeletonProps {
  className?: string
}

export function FollowButtonSkeleton({
  className,
}: FollowButtonSkeletonProps) {
  return (
    <div
      role='status'
      aria-label='Loading follow state'
      data-testid='follow-button-skeleton'
      className={cn('flex flex-col items-start gap-1', className)}
    >
      <Skeleton className={OUTER} />
    </div>
  )
}