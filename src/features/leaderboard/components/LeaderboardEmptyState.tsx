'use client'

/**
 * `LeaderboardEmptyState` — empty-state for the leaderboard table.
 *
 * Source epic:   Epic 3.11 — `/leaderboard` read-only render.
 * Source ticket: TKT-3.11.B4.
 *
 * Renders the canonical empty-state copy verbatim from
 * `PHASE_3_EPICS.md` line 1198:
 *
 *   "No leaderboard data yet — play some quizzes to populate the ranks."
 *
 * The component surfaces a `Retry` button when `onRetry` is provided
 * (the 5xx → retry-banner case from `useCursorPaginated`). When
 * `onRetry` is omitted (the genuine empty-data case), the button is
 * not rendered — the user is invited to play quizzes instead.
 *
 * The component uses the existing `EmptyState` primitive from
 * `src/components/ui/EmptyState.tsx`. The primitive handles the
 * icon / title / description / action layout.
 */

import { Trophy } from 'lucide-react'

import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/shared/utils/merge-class-names'

const LEADERBOARD_EMPTY_COPY =
  'No leaderboard data yet — play some quizzes to populate the ranks.'

export interface LeaderboardEmptyStateProps {
  /** Optional retry handler. When provided, a `Retry` button is rendered. */
  onRetry?: () => void
  /** Optional class name for the outer wrapper. */
  className?: string
}

export function LeaderboardEmptyState({
  onRetry,
  className,
}: LeaderboardEmptyStateProps) {
  return (
    <div
      data-testid='leaderboard-empty-state'
      className={cn(
        'bg-card border border-border rounded-lg overflow-hidden',
        className,
      )}
    >
      <EmptyState
        icon={Trophy}
        title='Leaderboard is empty'
        description={LEADERBOARD_EMPTY_COPY}
        actions={
          onRetry
            ? [
                {
                  label: 'Retry',
                  variant: 'outline',
                  onClick: onRetry,
                },
              ]
            : undefined
        }
      />
    </div>
  )
}
