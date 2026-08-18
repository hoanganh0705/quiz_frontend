

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import { DailyChallengeCardSkeleton } from '@/features/daily-challenge/components/DailyChallengeSkeleton'
import { DailyChallengeHistorySkeleton } from '@/features/daily-challenge/components/DailyChallengeSkeleton'
import { DailyChallengeCard } from '@/features/daily-challenge/components/DailyChallengeCard'
import { DailyChallengePlaceholder } from '@/features/daily-challenge/components/DailyChallengePlaceholder'
import type { DailyChallengeView } from '@/features/daily-challenge/types/dto'

afterEach(() => {
cleanup()
})

const challenge: DailyChallengeView = {
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
