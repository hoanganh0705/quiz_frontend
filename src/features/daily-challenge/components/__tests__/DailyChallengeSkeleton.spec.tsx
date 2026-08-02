/**
 * `DailyChallengeSkeleton.spec.tsx` — locks the loading skeleton
 * contract (TKT-3.12.B3).
 *
 * Four cases per the ticket's testing checklist:
 *
 *   (1) `DailyChallengeCardSkeleton` renders with `aria-busy='true'`
 *       and matches the live `<DailyChallengeCard />` outer
 *       dimensions exactly (CLS-zero invariant).
 *   (2) `DailyChallengeHistorySkeleton` renders N rows (default 3)
 *       and exposes `aria-busy='true'`.
 *   (3) The skeleton is non-interactive.
 *   (4) The skeleton and the placeholder share the same outer
 *       dimensions (so a placeholder → skeleton → live transition
 *       never shifts the layout).
 */

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import { DailyChallengeCardSkeleton } from '@/features/daily-challenge/components/DailyChallengeSkeleton'
import { DailyChallengeHistorySkeleton } from '@/features/daily-challenge/components/DailyChallengeSkeleton'
import { DailyChallengeCard } from '@/features/daily-challenge/components/DailyChallengeCard'
import { DailyChallengePlaceholder } from '@/features/daily-challenge/components/DailyChallengePlaceholder'

afterEach(() => {
  cleanup()
})

const challenge = {
  id: 'challenge-1',
  date: '2026-08-02T00:00:00.000Z',
  quizId: 'quiz-1',
  category: 'Science',
  totalQuestions: 5,
  rewardXp: 100,
}

describe('DailyChallengeCardSkeleton — render', () => {
  it('(1) renders with aria-busy="true" and a stable aria-label', () => {
    render(<DailyChallengeCardSkeleton />)
    const sk = screen.getByTestId('daily-challenge-card-skeleton')
    expect(sk).toHaveAttribute('aria-busy', 'true')
    expect(sk).toHaveAttribute('aria-label', 'Loading daily challenge')
  })

  it('(3) is non-interactive — no buttons, no links', () => {
    render(<DailyChallengeCardSkeleton />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('(4) shares the live card\'s outer min-h-40 class', () => {
    const { container: skContainer } = render(<DailyChallengeCardSkeleton />)
    const skClasses =
      skContainer.querySelector('[data-testid="daily-challenge-card-skeleton"]')
        ?.className ?? ''
    expect(skClasses).toContain('min-h-40')
  })
})

describe('DailyChallengeHistorySkeleton — render', () => {
  it('(2) renders N rows (default 3) and exposes aria-busy="true"', () => {
    render(<DailyChallengeHistorySkeleton />)
    const sk = screen.getByTestId('daily-challenge-history-skeleton')
    expect(sk).toHaveAttribute('aria-busy', 'true')

    // Three rows (cards), each with the `border-b border-border`
    // separator. The selector matches the row container.
    const rows = sk.querySelectorAll('.border-b.border-border')
    expect(rows.length).toBe(3)
  })

  it('(2b) renders the requested row count when `rows` is overridden', () => {
    render(<DailyChallengeHistorySkeleton rows={5} />)
    const sk = screen.getByTestId('daily-challenge-history-skeleton')
    const rows = sk.querySelectorAll('.border-b.border-border')
    expect(rows.length).toBe(5)
  })
})

describe('CLS-zero invariant — skeleton dimensions', () => {
  it('(4) the card skeleton matches the live card\'s outer min-h-40', () => {
    const { container: skContainer } = render(<DailyChallengeCardSkeleton />)
    const { container: cardContainer } = render(
      <DailyChallengeCard challenge={challenge} />,
    )
    const { container: phContainer } = render(<DailyChallengePlaceholder />)

    const skMinH = skContainer.querySelector(
      '[data-testid="daily-challenge-card-skeleton"]',
    )?.className.includes('min-h-40')
    const cardMinH = cardContainer.querySelector(
      '[data-testid="daily-challenge-card"]',
    )?.className.includes('min-h-40')
    const phMinH = phContainer.querySelector(
      '[data-testid="daily-challenge-placeholder"]',
    )?.className.includes('min-h-40')

    expect(skMinH).toBe(true)
    expect(cardMinH).toBe(true)
    expect(phMinH).toBe(true)
  })
})
