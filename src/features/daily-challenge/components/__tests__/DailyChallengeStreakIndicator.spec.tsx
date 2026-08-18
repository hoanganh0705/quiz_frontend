

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import { DailyChallengeStreakIndicator } from '@/features/daily-challenge/components/DailyChallengeStreakIndicator'

afterEach(() => {
cleanup()
})

describe('DailyChallengeStreakIndicator — render', () => {
it('(1) renders the day count and an icon for streak = 7', () => {
render(<DailyChallengeStreakIndicator streak={7} />)
expect(screen.getByTestId('daily-challenge-streak-indicator')).toBeInTheDocument()
expect(screen.getByText(/^7 days streak$/)).toBeInTheDocument()
  })

it('(2) singular form "1 day streak" for streak = 1', () => {
render(<DailyChallengeStreakIndicator streak={1} />)
expect(screen.getByText(/^1 day streak$/)).toBeInTheDocument()
  })

it('(3) plural form "0 days streak" for streak = 0', () => {
render(<DailyChallengeStreakIndicator streak={0} />)
expect(screen.getByText(/^0 days streak$/)).toBeInTheDocument()
  })

it('(4) aria-label matches the count and singular/plural discriminator', () => {
const { rerender } = render(<DailyChallengeStreakIndicator streak={5} />)
expect(
screen.getByLabelText('Current streak: 5 days'),
    ).toBeInTheDocument()

rerender(<DailyChallengeStreakIndicator streak={1} />)
expect(
screen.getByLabelText('Current streak: 1 day'),
    ).toBeInTheDocument()
  })
})
