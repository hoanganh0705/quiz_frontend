/**
 * `DailyChallengeCard.spec.tsx` — locks the live-card surface (TKT-3.12.B3).
 *
 * Three cases per the ticket's testing checklist:
 *
 *   (1) Renders the category, the date, the question count, and the
 *       reward XP for the day's challenge.
 *   (2) The card has `role="region"` and `aria-labelledby` so screen
 *       readers can navigate to it as a landmark.
 *   (3) The card is non-interactive (`onClick` is not bound; the
 *       element has no focusable children).
 */

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import { DailyChallengeCard } from '@/features/daily-challenge/components/DailyChallengeCard'

afterEach(() => {
  cleanup()
})

const fixture = {
  id: 'challenge-1',
  date: '2026-08-02T00:00:00.000Z',
  quizId: 'quiz-1',
  category: 'Science',
  totalQuestions: 5,
  rewardXp: 100,
}

describe('DailyChallengeCard — render', () => {
  it('(1) renders the category, the date, the question count, and the reward XP', () => {
    render(<DailyChallengeCard challenge={fixture} />)
    expect(screen.getByText(/Science Challenge/)).toBeInTheDocument()
    expect(
      screen.getByLabelText('Reward: 100 XP'),
    ).toBeInTheDocument()
    expect(screen.getByText('5 questions')).toBeInTheDocument()
    expect(screen.getByText('2026-08-02T00:00:00.000Z')).toBeInTheDocument()
  })

  it('(2) renders with role="region" and a stable aria-labelledby', () => {
    render(<DailyChallengeCard challenge={fixture} />)
    const card = screen.getByTestId('daily-challenge-card')
    expect(card).toHaveAttribute('role', 'region')
    expect(card).toHaveAttribute(
      'aria-labelledby',
      'daily-challenge-card-title',
    )
  })

  it('(3) is non-interactive — no buttons, no links, no focusable children', () => {
    render(<DailyChallengeCard challenge={fixture} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })
})
