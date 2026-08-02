/**
 * `DailyChallengePlaceholder.spec.tsx` — locks the locked-default
 * surface (TKT-3.12.B3).
 *
 * Three cases per the ticket's testing checklist:
 *
 *   (1) Renders the "Coming soon" copy and the placeholder icon.
 *   (2) `aria-live='polite'` is set so screen readers do not
 *       mis-announce the placeholder as a loading state
 *       (`aria-busy='false'`).
 *   (3) The placeholder is non-interactive — no buttons, no links,
 *       no focusable children.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import { DailyChallengePlaceholder } from '@/features/daily-challenge/components/DailyChallengePlaceholder'

afterEach(() => {
  cleanup()
})

describe('DailyChallengePlaceholder — render', () => {
  it('(1) renders the "Coming soon" copy and the placeholder icon', () => {
    render(<DailyChallengePlaceholder />)
    expect(
      screen.getByLabelText('Coming soon'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Daily Challenge/),
    ).toBeInTheDocument()
  })

  it('(2) does not announce itself as a loading state', () => {
    render(<DailyChallengePlaceholder />)
    const ph = screen.getByTestId('daily-challenge-placeholder')
    expect(ph).toHaveAttribute('aria-busy', 'false')
    expect(ph).toHaveAttribute('aria-live', 'polite')
  })

  it('(3) is non-interactive — no buttons, no links, no focusable children', () => {
    render(<DailyChallengePlaceholder />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })
})
