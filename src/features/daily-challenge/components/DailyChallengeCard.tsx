'use client'

/**
 * `DailyChallengeCard` — the day's featured challenge card.
 *
 * Source epic:   Epic 3.12 — `/daily-challenge` read-only render.
 * Source story:  `projectDocs/Epics/PHASE_3_EPICS.md` → Story 3.12.
 * Source ticket: TKT-3.12.B3.
 *
 * Renders the category, the date (verbatim per
 * `EPIC_3_12_A1.md` §5), the question count, and the reward XP for the
 * day's challenge. The card is the live surface — it is rendered when
 * the wrapper reports `kind: 'ok'`. The placeholder surface
 * (`<DailyChallengePlaceholder />`) is rendered when the wrapper reports
 * `kind: 'missing-endpoint'`; the skeleton is rendered during the
 * initial loading phase. The live composition (TKT-3.12.C1) switches
 * between them.
 *
 * ## CLS-zero invariant
 *
 * The card's outer dimensions (`min-h-40`, fixed `padding`, and
 * fixed `gap`) match the skeleton's dimensions exactly. A future
 * change that alters one without the other will fail the
 * `DailyChallengeSkeleton.matchesCardDimensions` test in B3.
 *
 * ## Accessibility
 *
 * The card is a non-interactive display — no `onClick` — and is the
 * first region of the page content. The `role="region"` and the
 * `aria-labelledby` give screen readers a navigable landmark.
 */

import { Calendar, Sparkles, Clock, Trophy } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

import { cn } from '@/shared/utils/merge-class-names'

import type { DailyChallengeView } from '../types/dto'

export interface DailyChallengeCardProps {
  challenge: DailyChallengeView
  className?: string
}

export function DailyChallengeCard({
  challenge,
  className,
}: DailyChallengeCardProps) {
  return (
    <Card
      role='region'
      aria-labelledby='daily-challenge-card-title'
      data-testid='daily-challenge-card'
      className={cn(
        'min-h-40 border bg-background text-foreground py-6',
        className,
      )}
    >
      <CardHeader>
        <div className='flex justify-between items-start gap-2'>
          <div>
            <CardTitle
              id='daily-challenge-card-title'
              className='text-xl font-bold'
            >
              {challenge.category} Challenge
            </CardTitle>
            <p className='mt-1 text-foreground/70 text-sm'>
              Take on today&apos;s curated set of questions. Earn XP when
              you finish.
            </p>
          </div>
          <div
            className='flex items-center space-x-2 text-muted-foreground text-sm'
            aria-label={`Reward: ${challenge.rewardXp} XP`}
          >
            <Sparkles className='h-4 w-4' aria-hidden='true' />
            <span className='font-medium'>+{challenge.rewardXp} XP</span>
          </div>
        </div>
        <div className='flex items-center gap-4 pt-2 text-xs text-foreground/70'>
          <span className='inline-flex items-center gap-1'>
            <Calendar className='h-3.5 w-3.5' aria-hidden='true' />
            <time dateTime={challenge.date}>{challenge.date}</time>
          </span>
          <span className='inline-flex items-center gap-1'>
            <Clock className='h-3.5 w-3.5' aria-hidden='true' />
            <span>{challenge.totalQuestions} questions</span>
          </span>
          <span className='inline-flex items-center gap-1'>
            <Trophy className='h-3.5 w-3.5' aria-hidden='true' />
            <span>Daily challenge</span>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Card body intentionally minimal — the live surface is "read
            and start"; the question UI is not in scope for Story 3.12. */}
        <p className='text-sm text-foreground/70'>
          Read today&apos;s prompt and start the challenge. Your streak
          updates when you finish.
        </p>
      </CardContent>
    </Card>
  )
}
