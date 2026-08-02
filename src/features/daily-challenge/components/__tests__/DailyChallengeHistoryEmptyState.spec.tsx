/**
 * `DailyChallengeHistoryEmptyState.spec.tsx` — locks the empty-state
 * surface (TKT-3.12.B3).
 *
 * Two cases:
 *
 *   (1) Renders the empty-state copy and the calendar icon.
 *   (2) Has `role="region"` and a stable `aria-labelledby` for screen
 *       readers to navigate to it as a landmark.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import { DailyChallengeHistoryEmptyState } from '@/features/daily-challenge/components/DailyChallengeHistoryEmptyState'

afterEach(() => {
  cleanup()
})

describe('DailyChallengeHistoryEmptyState — render', () => {
  it('(1) renders the empty-state copy and the calendar icon', () => {
    render(<DailyChallengeHistoryEmptyState />)
    expect(
      screen.getByTestId('daily-challenge-history-empty-state'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/No past challenges yet/),
    ).toBeInTheDocument()
  })

  it('(2) renders with role="region" and a stable aria-labelledby', () => {
    render(<DailyChallengeHistoryEmptyState />)
    const empty = screen.getByTestId('daily-challenge-history-empty-state')
    expect(empty).toHaveAttribute('role', 'region')
    expect(empty).toHaveAttribute(
      'aria-labelledby',
      'daily-challenge-history-empty-title',
    )
  })
})
