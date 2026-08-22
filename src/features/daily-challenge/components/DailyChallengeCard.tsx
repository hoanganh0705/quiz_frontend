'use client'

/**
 * `DailyChallengeCard` — the day's featured challenge card.
 *
 * Source epic:   Epic 3.12 — `/daily-challenge` read-only render.
 * Source story:  `projectDocs/Epics/PHASE_3_EPICS.md` → Story 3.12.
 * Source ticket: TKT-3.12.B3 (card) + step3-card (status-aware CTAs).
 *
 * Renders the day's quiz title, date (verbatim per
 * `EPIC_3_12_A1.md` §5), question count, difficulty pill, and the
 * reward XP. The card is the live surface — it is rendered when the
 * wrapper reports `kind: 'ok'`. The placeholder surface
 * (`<DailyChallengePlaceholder />`) is rendered when the wrapper
 * reports `kind: 'missing-endpoint'`; the skeleton is rendered
 * during the initial loading phase. The live composition
 * (TKT-3.12.C1) switches between them.
 *
 * ## Status-aware CTAs
 *
 *   - `status === 'pending'` + unauthenticated → "Sign in to play"
 *     link to `/login?next=/daily-challenge`.
 *   - `status === 'pending'` + authenticated → inline "Start today's
 *     challenge" affordance (the play surface below toggles to active;
 *     no navigation needed).
 *   - `status === 'completed'` → recap line: "You scored X% — Rank #Y
 *     — see you tomorrow."
 *   - `status === 'expired'` → expired copy line, no CTA.
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
 * The card is a non-interactive display by default; the CTA links
 * are keyboard-reachable. The `role="region"` and the
 * `aria-labelledby` give screen readers a navigable landmark.
 */

import Link from 'next/link'
import { Calendar, Sparkles, Clock, Trophy, LogIn, Play } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

import { cn } from '@/shared/utils/merge-class-names'

import type { DailyChallengeView } from '../types/dto'

export interface DailyChallengeCardProps {
  challenge: DailyChallengeView
  /** Whether the viewer is authenticated (drives the CTA branch). */
  isAuthenticated?: boolean
  className?: string
}

const DIFFICULTY_LABEL: Record<DailyChallengeView['difficulty'], string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

const DIFFICULTY_VARIANT: Record<
  DailyChallengeView['difficulty'],
  'difficulty-easy' | 'difficulty-medium' | 'difficulty-hard'
> = {
  easy: 'difficulty-easy',
  medium: 'difficulty-medium',
  hard: 'difficulty-hard',
}

function StatusCta({
  challenge,
  isAuthenticated,
}: {
  challenge: DailyChallengeView
  isAuthenticated: boolean
}) {
  if (challenge.status === 'completed') {
    const score = challenge.scorePercent ?? 0;
    const rank = challenge.rank ?? 0;
    return (
      <p
        className='text-sm text-foreground/80'
        data-testid='daily-challenge-card-completed'
      >
        You scored <span className='font-semibold'>{Math.round(score)}%</span>
        {' '}— Rank{' '}
        <span className='font-semibold'>#{rank.toLocaleString()}</span> — see
        you tomorrow.
      </p>
    )
  }

  if (challenge.status === 'expired') {
    return (
      <p
        className='text-sm text-foreground-secondary'
        data-testid='daily-challenge-card-expired'
      >
        Today&apos;s window has closed. The next challenge goes live at
        midnight.
      </p>
    )
  }

  // status === 'pending'
  if (!isAuthenticated) {
    return (
      <Link
        href='/login?next=/daily-challenge'
        data-testid='daily-challenge-card-signin'
        className='inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline'
      >
        <LogIn className='h-3.5 w-3.5' aria-hidden='true' />
        <span>Sign in to play</span>
      </Link>
    )
  }

  return (
    <p
      className='inline-flex items-center gap-1.5 text-sm font-medium text-primary'
      data-testid='daily-challenge-card-cta'
    >
      <Play className='h-3.5 w-3.5' aria-hidden='true' />
      <span>Start today&apos;s challenge below.</span>
    </p>
  )
}

export function DailyChallengeCard({
  challenge,
  isAuthenticated = false,
  className,
}: DailyChallengeCardProps) {
  return (
    <Card
      role='region'
      aria-labelledby='daily-challenge-card-title'
      data-testid='daily-challenge-card'
      data-status={challenge.status}
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
              {challenge.quizTitle || `${challenge.category} Challenge`}
            </CardTitle>
            <p className='mt-1 text-foreground-secondary text-sm'>
              Take on today&apos;s curated set of questions. Earn XP when
              you finish.
            </p>
          </div>
          <div className='flex items-center space-x-2 text-muted-foreground text-sm'>
            <Badge
              variant={DIFFICULTY_VARIANT[challenge.difficulty]}
              data-testid='daily-challenge-card-difficulty'
              data-difficulty={challenge.difficulty}
              aria-label={`Difficulty: ${DIFFICULTY_LABEL[challenge.difficulty]}`}
            >
              {DIFFICULTY_LABEL[challenge.difficulty]}
            </Badge>
            <div
              className='inline-flex items-center space-x-1 text-muted-foreground text-sm'
              aria-label={`Reward: ${challenge.rewardXp} XP`}
            >
              <Sparkles className='h-4 w-4' aria-hidden='true' />
              <span className='font-medium'>+{challenge.rewardXp} XP</span>
            </div>
          </div>
        </div>
        <div className='flex items-center gap-4 pt-2 text-xs text-foreground-secondary'>
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
        <StatusCta challenge={challenge} isAuthenticated={isAuthenticated} />
      </CardContent>
    </Card>
  )
}