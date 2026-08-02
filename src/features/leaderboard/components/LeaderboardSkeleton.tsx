'use client'

/**
 * `LeaderboardSkeleton` — loading skeleton for the leaderboard table.
 *
 * Source epic:   Epic 3.11 — `/leaderboard` read-only render.
 * Source ticket: TKT-3.11.B4.
 *
 * Renders 10 row skeletons (configurable via the `count` prop) using
 * the existing `LeaderboardRowSkeleton` primitive. The skeleton's
 * outer dimensions match the live table's outer dimensions at every
 * breakpoint — the CLS = 0 invariant is enforced by reusing the same
 * row primitive the live table uses, with the same `space-y-1 p-2`
 * inner layout.
 *
 * The skeleton is the loading state of the leaderboard list. The
 * composition (Batch C) renders the skeleton while
 * `useLeaderboard(period).isLoading === true` and before the first
 * page has resolved.
 *
 * Note: this component renders ONLY the table-row skeleton. The
 * podium (top-3 players) skeleton is owned by the page-level
 * `loading.tsx` because the podium is part of the page chrome, not
 * the table.
 */

import { LeaderboardRowSkeleton } from '@/components/ui/loading-states/Skeletons'
import { cn } from '@/shared/utils/merge-class-names'

export interface LeaderboardSkeletonProps {
  /** Number of row skeletons to render. Defaults to 10 (CLS = 0 invariant). */
  count?: number
  /** Optional class name for the outer wrapper. */
  className?: string
}

export function LeaderboardSkeleton({
  count = 10,
  className,
}: LeaderboardSkeletonProps) {
  return (
    <div
      role='status'
      aria-live='polite'
      aria-label='Loading leaderboard'
      data-testid='leaderboard-skeleton'
      className={cn(
        'bg-card border border-border rounded-lg overflow-hidden',
        className,
      )}
    >
      <div className='space-y-1 p-2'>
        {Array.from({ length: count }).map((_, i) => (
          <LeaderboardRowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
