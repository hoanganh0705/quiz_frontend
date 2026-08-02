'use client'

/**
 * `DailyChallengeHistoryEmptyState` — empty-state surface for the
 * history list.
 *
 * Source epic:   Epic 3.12 — `/daily-challenge` read-only render.
 * Source story:  `projectDocs/Epics/PHASE_3_EPICS.md` → Story 3.12.
 * Source ticket: TKT-3.12.B3.
 *
 * Rendered when the history list has no items. The component is also
 * rendered (transparently) by the list when `items.length === 0`. The
 * composition does NOT render the empty state alongside the list — the
 * list delegates.
 *
 * The surface is intentionally minimal: a single line of copy plus a
 * calendar icon. The empty state also covers the "missing-endpoint"
 * case via the page composition (TKT-3.12.C1) — the placeholder
 * renders instead of the empty state in that case; this empty state is
 * for a live, empty response.
 */

import { Calendar } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/Card'

import { cn } from '@/shared/utils/merge-class-names'

export interface DailyChallengeHistoryEmptyStateProps {
  className?: string
}

export function DailyChallengeHistoryEmptyState({
  className,
}: DailyChallengeHistoryEmptyStateProps) {
  return (
    <Card
      data-testid='daily-challenge-history-empty-state'
      role='region'
      aria-labelledby='daily-challenge-history-empty-title'
      className={cn(
        'border bg-background text-foreground py-6',
        className,
      )}
    >
      <CardContent className='flex items-center justify-center min-h-24 p-4 gap-3 text-foreground/70'>
        <Calendar className='h-5 w-5' aria-hidden='true' />
        <p
          id='daily-challenge-history-empty-title'
          className='text-sm font-medium'
        >
          No past challenges yet. Take today&apos;s challenge to start
          your streak.
        </p>
      </CardContent>
    </Card>
  )
}
