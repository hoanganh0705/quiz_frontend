/**
 * `DailyChallengeStreakIndicator` — presentational streak indicator for
 * the daily-challenge page.
 *
 * Source epic:   Epic 3.12 — `/daily-challenge` read-only render.
 * Source story:  `projectDocs/Epics/PHASE_3_EPICS.md` → Story 3.12.
 * Source ticket: TKT-3.12.B2.
 *
 * Renders a small read-only indicator (`<Flame />` icon + the streak
 * count) for any `streak >= 0`. The indicator is **always rendered**
 * by the page composition when the user is authenticated; the
 * composition does the auth gate (the indicator itself does not
 * inspect the user payload).
 *
 * ## Accessibility
 *
 * The indicator has `aria-label="Current streak: N days"` (or
 * equivalent) so screen readers announce the count even though the
 * visual is icon-led. The indicator is a non-interactive display — it
 * has no `onClick` and is not focusable.
 *
 * ## Why a separate component
 *
 * The card surface (TKT-3.12.B3) embeds the indicator inline, but
 * keeping it as a dedicated component (a) makes the streak contract
 * testable in isolation and (b) lets a future story (Phase 5) move
 * the indicator to a header without changing the card surface.
 */

import { Flame } from 'lucide-react'

import { cn } from '@/shared/utils/merge-class-names'

export interface DailyChallengeStreakIndicatorProps {
  streak: number
  className?: string
}

export function DailyChallengeStreakIndicator({
  streak,
  className,
}: DailyChallengeStreakIndicatorProps) {
  return (
    <span
      data-testid='daily-challenge-streak-indicator'
      aria-label={`Current streak: ${streak} ${streak === 1 ? 'day' : 'days'}`}
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium text-foreground/90',
        className,
      )}
    >
      <Flame className='h-4 w-4 text-orange-400' aria-hidden='true' />
      <span aria-hidden='true'>
        {streak} {streak === 1 ? 'day' : 'days'} streak
      </span>
    </span>
  )
}
