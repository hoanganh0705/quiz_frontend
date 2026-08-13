/**
 * `DailyChallengeCard.spec.tsx` — locks the live-card surface (TKT-3.12.B3)
 * plus the status-aware CTAs introduced in step3-card.
 *
 * Cases per the ticket's testing checklist:
 *
 *   (1) Renders the quiz title, the difficulty pill, the date, the
 *       question count, and the reward XP for the day's challenge.
 *   (2) The card has `role="region"` and `aria-labelledby` so screen
 *       readers can navigate to it as a landmark.
 *   (3) The card is non-interactive when status is `completed` or
 *       `expired` (no buttons, no links).
 *   (4) `status: 'pending'` + unauthenticated → renders the "Sign in
 *       to play" link to `/login?next=/daily-challenge`.
 *   (5) `status: 'pending'` + authenticated → renders the in-place
 *       "Start today's challenge below." affordance (no link).
 *   (6) `status: 'completed'` → renders the recap line with the
 *       score percent and the rank.
 *   (7) `status: 'expired'` → renders the expired copy line, no CTA.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import { DailyChallengeCard } from '@/features/daily-challenge/components/DailyChallengeCard'
import type { DailyChallengeView } from '@/features/daily-challenge/types/dto'

afterEach(() => {
  cleanup()
})

function makeChallenge(
  overrides: Partial<DailyChallengeView> = {},
): DailyChallengeView {
  return {
    id: 'challenge-1',
    date: '2026-08-02T00:00:00.000Z',
    quizId: 'quiz-1',
    quizTitle: 'Solar System Trivia',
    slug: 'solar-system-trivia',
    category: 'medium',
    difficulty: 'medium',
    totalQuestions: 5,
    rewardXp: 100,
    expiresAt: '2026-08-03T00:00:00.000Z',
    status: 'pending',
    scorePercent: null,
    rank: null,
    ...overrides,
  }
}

describe('DailyChallengeCard — render', () => {
  it('(1) renders the quiz title, difficulty pill, date, question count, and reward XP', () => {
    render(
      <DailyChallengeCard
        challenge={makeChallenge({ difficulty: 'easy' })}
      />,
    )
    expect(screen.getByText(/Solar System Trivia/)).toBeInTheDocument()
    expect(
      screen.getByLabelText('Reward: 100 XP'),
    ).toBeInTheDocument()
    expect(screen.getByText('5 questions')).toBeInTheDocument()
    expect(screen.getByText('2026-08-02T00:00:00.000Z')).toBeInTheDocument()
    expect(
      screen.getByTestId('daily-challenge-card-difficulty'),
    ).toHaveTextContent(/Easy/)
  })

  it('(2) renders with role="region" and a stable aria-labelledby', () => {
    render(<DailyChallengeCard challenge={makeChallenge()} />)
    const card = screen.getByTestId('daily-challenge-card')
    expect(card).toHaveAttribute('role', 'region')
    expect(card).toHaveAttribute(
      'aria-labelledby',
      'daily-challenge-card-title',
    )
  })

  it('(3) status=completed — non-interactive, no buttons, no links', () => {
    render(
      <DailyChallengeCard
        challenge={makeChallenge({
          status: 'completed',
          scorePercent: 80,
          rank: 5,
        })}
      />,
    )
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('(4) status=pending + unauthenticated — renders the "Sign in to play" link', () => {
    render(
      <DailyChallengeCard
        challenge={makeChallenge({ status: 'pending' })}
        isAuthenticated={false}
      />,
    )
    const link = screen.getByTestId('daily-challenge-card-signin')
    expect(link).toHaveAttribute('href', '/login?next=/daily-challenge')
    expect(link).toHaveTextContent(/Sign in to play/)
  })

  it('(5) status=pending + authenticated — renders the "Start today\'s challenge below." affordance', () => {
    render(
      <DailyChallengeCard
        challenge={makeChallenge({ status: 'pending' })}
        isAuthenticated={true}
      />,
    )
    expect(
      screen.getByTestId('daily-challenge-card-cta'),
    ).toHaveTextContent(/Start today's challenge below\./)
    expect(screen.queryByTestId('daily-challenge-card-signin')).toBeNull()
  })

  it('(6) status=completed — renders the recap line with score and rank', () => {
    render(
      <DailyChallengeCard
        challenge={makeChallenge({
          status: 'completed',
          scorePercent: 80,
          rank: 5,
        })}
      />,
    )
    expect(
      screen.getByTestId('daily-challenge-card-completed'),
    ).toHaveTextContent(/You scored 80%/)
    expect(
      screen.getByTestId('daily-challenge-card-completed'),
    ).toHaveTextContent(/Rank\s*#5/)
  })

  it('(7) status=expired — renders the expired copy line, no CTA', () => {
    render(
      <DailyChallengeCard
        challenge={makeChallenge({ status: 'expired' })}
      />,
    )
    expect(
      screen.getByTestId('daily-challenge-card-expired'),
    ).toHaveTextContent(/Today.s window has closed/)
    expect(screen.queryByTestId('daily-challenge-card-cta')).toBeNull()
    expect(screen.queryByTestId('daily-challenge-card-signin')).toBeNull()
  })
})