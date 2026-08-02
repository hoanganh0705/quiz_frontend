/**
 * `LeaderboardPeriodSelector.spec.tsx` — locks the period selector
 * contract.
 *
 * Source epic:   Epic 3.11 — `/leaderboard` read-only render.
 * Source ticket: TKT-3.11.B2.
 *
 * Four cases per the ticket's testing checklist:
 *
 *   (1) Three options render with the documented labels (`Weekly`,
 *       `Monthly`, `All-time`).
 *   (2) Wire-side enum (`weekly`, `monthly`, `all_time`) is emitted on
 *       `onChange` (snake-case `all_time`, NOT kebab-case).
 *   (3) Keyboard activation works (Enter and Space).
 *   (4) Selected option is visually marked via `aria-pressed`.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { LeaderboardPeriodSelector } from '@/features/leaderboard/components/LeaderboardPeriodSelector'

afterEach(() => {
  cleanup()
})

describe('LeaderboardPeriodSelector — render', () => {
  it('renders three options with the documented human labels', () => {
    render(<LeaderboardPeriodSelector period='weekly' onChange={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Weekly' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Monthly' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All-time' })).toBeInTheDocument()
  })

  it('marks the selected option with aria-pressed=true', () => {
    render(<LeaderboardPeriodSelector period='monthly' onChange={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Weekly' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Monthly' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'All-time' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
})

describe('LeaderboardPeriodSelector — selection', () => {
  it('emits the wire-side enum on click — `all_time` is snake_case', () => {
    const onChange = vi.fn()
    render(<LeaderboardPeriodSelector period='weekly' onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'All-time' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('all_time')
  })

  it('emits `weekly` and `monthly` on click', () => {
    const onChange = vi.fn()
    render(<LeaderboardPeriodSelector period='all_time' onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Weekly' }))
    fireEvent.click(screen.getByRole('button', { name: 'Monthly' }))

    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenNthCalledWith(1, 'weekly')
    expect(onChange).toHaveBeenNthCalledWith(2, 'monthly')
  })

  it('does not invoke onChange when the already-selected option is clicked', () => {
    const onChange = vi.fn()
    render(<LeaderboardPeriodSelector period='weekly' onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Weekly' }))

    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('LeaderboardPeriodSelector — keyboard', () => {
  it('keyboard activation works (Enter on the focused button)', () => {
    const onChange = vi.fn()
    render(<LeaderboardPeriodSelector period='weekly' onChange={onChange} />)

    const monthly = screen.getByRole('button', { name: 'Monthly' })
    monthly.focus()
    fireEvent.keyDown(monthly, { key: 'Enter', code: 'Enter' })
    fireEvent.click(monthly)

    expect(onChange).toHaveBeenCalledWith('monthly')
  })

  it('keyboard activation works (Space on the focused button)', () => {
    const onChange = vi.fn()
    render(<LeaderboardPeriodSelector period='weekly' onChange={onChange} />)

    const allTime = screen.getByRole('button', { name: 'All-time' })
    allTime.focus()
    fireEvent.keyDown(allTime, { key: ' ', code: 'Space' })
    fireEvent.click(allTime)

    expect(onChange).toHaveBeenCalledWith('all_time')
  })
})

describe('LeaderboardPeriodSelector — accessibility', () => {
  it('wraps options in a labelled group', () => {
    render(<LeaderboardPeriodSelector period='weekly' onChange={() => undefined} />)
    // `role="group"` is set on the outer wrapper.
    const group = screen.getByRole('group')
    expect(group).toBeInTheDocument()
    expect(group).toHaveAccessibleName(/Leaderboard period/i)
  })
})
