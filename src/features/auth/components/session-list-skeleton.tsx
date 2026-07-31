'use client';

/**
 * `SessionListSkeleton` — stable loading footprint for the
 * active-sessions list.
 *
 * Source epic: Epic 2.8 — Security dashboard and active-session management.
 * Source ticket: 2.8.T15.
 *
 * ## Why this exists
 *
 * US-2.8.2 requires "Loading renders row-level skeletons, not a
 * single spinner". A single spinner would collapse the vertical
 * footprint to ~64px; three populated rows take ~250px. Swapping
 * one for the other would jolt the page. This skeleton mirrors
 * the populated `<SessionRow />`'s footprint row-for-row so the
 * transition is invisible.
 *
 * ## `rowCount` prop
 *
 * Defaults to 3 — the typical "this user is signed in on a few
 * devices" case. The list passes this through so a high-traffic
 * account can pre-reserve more vertical space if we ever expose
 * the count from the dashboard; today the dashboard does not
 * leak the count, so 3 is the safe default.
 *
 * ## AT invisibility
 *
 * Skeletons are decorative — the screen-reader user should hear
 * the list's title/description text and skip the placeholder
 * rows. `aria-hidden` on the list + `aria-busy` on the outer
 * wrapper is the dual-channel contract.
 *
 * @see SessionRow (2.8.T13)
 */

import { Skeleton } from '@/components/ui/Skeleton';

export interface SessionListSkeletonProps {
  rowCount?: number;
}

export function SessionListSkeleton({ rowCount = 3 }: SessionListSkeletonProps) {
  const count = Math.max(1, Math.min(rowCount, 10));
  return (
    <ul
      aria-hidden='true'
      aria-busy='true'
      data-testid='session-list-skeleton'
    >
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className='flex items-start gap-4 py-4 border-b border-border last:border-b-0'
        >
          <div className='flex-1 min-w-0'>
            {/* Device line */}
            <Skeleton className='h-5 w-2/3 mb-2' />
            {/* IP + last-active */}
            <Skeleton className='h-4 w-1/2' />
          </div>
          {/* Revoke button placeholder */}
          <Skeleton className='h-9 w-20' />
        </li>
      ))}
    </ul>
  );
}
