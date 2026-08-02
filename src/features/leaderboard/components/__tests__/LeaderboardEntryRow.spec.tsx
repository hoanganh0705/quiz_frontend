/**
 * `LeaderboardEntryRow.spec.tsx` — locks the entry-row contract.
 *
 * Source epic:   Epic 3.11 — `/leaderboard` read-only render.
 * Source ticket: TKT-3.11.B3.
 *
 * Six cases per the ticket's testing checklist:
 *
 *   (1) Self-entry highlight ON when `isCurrentUser === true` AND
 *       `isAuthenticated === true`.
 *   (2) Self-entry highlight OFF when `isCurrentUser === false`.
 *   (3) `aria-current` is set only when self-entry highlight is on.
 *   (4) XP formatting with thousands separators (e.g. `12,345 XP`).
 *   (5) The row does NOT render a rank-change indicator (drift A1 #2).
 *   (6) No row semantics are added when `entry` has no `onClick` prop.
 */

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { LeaderboardEntryRow } from '@/features/leaderboard/components/LeaderboardEntryRow'
import type { LeaderboardEntryWithId } from '@/features/leaderboard/hooks/useLeaderboard'

function makeEntry(
  overrides: Partial<LeaderboardEntryWithId> = {},
): LeaderboardEntryWithId {
  return {
    id: overrides.userId ?? 'user-1',
    rank: 1,
    denseRank: 1,
    userId: 'user-1',
    displayName: 'Alice',
    avatarUrl: null,
    xp: 12345,
    isTied: false,
    isCurrentUser: false,
    ...overrides,
  }
}

describe('LeaderboardEntryRow — self-entry highlight', () => {
  it('highlights the row when `isCurrentUser === true` AND `isAuthenticated === true`', () => {
    const entry = makeEntry({ userId: 'me', isCurrentUser: true })
    const { container } = render(
      <LeaderboardEntryRow entry={entry} isAuthenticated={true} />,
    )

    const row = container.querySelector('[data-leaderboard-row="me"]')
    expect(row).not.toBeNull()
    expect(row).toHaveAttribute('aria-current', 'true')
    expect(screen.getByText('(you)')).toBeInTheDocument()
  })

  it('does NOT highlight when `isCurrentUser === false`', () => {
    const entry = makeEntry({ userId: 'someone-else', isCurrentUser: false })
    const { container } = render(
      <LeaderboardEntryRow entry={entry} isAuthenticated={true} />,
    )

    const row = container.querySelector('[data-leaderboard-row="someone-else"]')
    expect(row).not.toBeNull()
    expect(row).not.toHaveAttribute('aria-current')
    expect(screen.queryByText('(you)')).not.toBeInTheDocument()
  })

  it('does NOT highlight when `isAuthenticated === false` even if `isCurrentUser === true`', () => {
    const entry = makeEntry({ userId: 'someone', isCurrentUser: true })
    const { container } = render(
      <LeaderboardEntryRow entry={entry} isAuthenticated={false} />,
    )

    const row = container.querySelector('[data-leaderboard-row="someone"]')
    expect(row).not.toBeNull()
    expect(row).not.toHaveAttribute('aria-current')
    expect(screen.queryByText('(you)')).not.toBeInTheDocument()
  })

  it('does NOT highlight when `isCurrentUser` is null or undefined', () => {
    const entryNull = makeEntry({ userId: 'u-1', isCurrentUser: null })
    const { container, rerender } = render(
      <LeaderboardEntryRow entry={entryNull} isAuthenticated={true} />,
    )
    const row1 = container.querySelector('[data-leaderboard-row="u-1"]')
    expect(row1).not.toHaveAttribute('aria-current')

    const entryUndef = makeEntry({
      userId: 'u-1',
      isCurrentUser: undefined as unknown as null,
    })
    rerender(<LeaderboardEntryRow entry={entryUndef} isAuthenticated={true} />)
    const row2 = container.querySelector('[data-leaderboard-row="u-1"]')
    expect(row2).not.toHaveAttribute('aria-current')
  })
})

describe('LeaderboardEntryRow — XP formatting', () => {
  it('formats XP with thousands separators', () => {
    const entry = makeEntry({ xp: 12345 })
    render(<LeaderboardEntryRow entry={entry} isAuthenticated={false} />)
    expect(screen.getByText('12,345 XP')).toBeInTheDocument()
  })

  it('formats small XP without a separator', () => {
    const entry = makeEntry({ xp: 100 })
    render(<LeaderboardEntryRow entry={entry} isAuthenticated={false} />)
    expect(screen.getByText('100 XP')).toBeInTheDocument()
  })

  it('formats large XP with multiple separators', () => {
    const entry = makeEntry({ xp: 1234567 })
    render(<LeaderboardEntryRow entry={entry} isAuthenticated={false} />)
    expect(screen.getByText('1,234,567 XP')).toBeInTheDocument()
  })
})

describe('LeaderboardEntryRow — drift A1 #2: no rank-change indicator', () => {
  it('does not render a rank-change indicator in the row', () => {
    const entry = makeEntry({ rank: 5, denseRank: 5 })
    const { container } = render(
      <LeaderboardEntryRow entry={entry} isAuthenticated={false} />,
    )

    // The row should expose rank and dense rank labels only — no
    // rank-change / previousRank indicator. The presence of an
    // up/down arrow icon would be a regression against drift A1 #2.
    const rankLabel = screen.getByLabelText('Rank 5')
    const denseRankLabel = screen.getByLabelText('Dense rank 5')
    expect(rankLabel).toBeInTheDocument()
    expect(denseRankLabel).toBeInTheDocument()
    expect(container.querySelector('[data-testid="rank-change"]')).toBeNull()
    // No element with `aria-label` containing "rank change" or
    // "previous rank" should be present.
    expect(
      container.querySelector('[aria-label*="rank change" i]'),
    ).toBeNull()
    expect(
      container.querySelector('[aria-label*="previous rank" i]'),
    ).toBeNull()
  })
})

describe('LeaderboardEntryRow — non-interactive semantics', () => {
  it('does not add interactive semantics (no `role="button"`, no tabindex)', () => {
    const entry = makeEntry()
    const { container } = render(
      <LeaderboardEntryRow entry={entry} isAuthenticated={false} />,
    )

    const row = container.querySelector('[data-leaderboard-row]')
    expect(row).not.toBeNull()
    expect(row?.getAttribute('role')).not.toBe('button')
    expect(row?.hasAttribute('tabindex')).toBe(false)
    expect(row?.hasAttribute('onclick')).toBe(false)
  })
})

describe('LeaderboardEntryRow — render basics', () => {
  it('renders rank, dense rank, display name, and avatar fallback letter', () => {
    const entry = makeEntry({
      rank: 7,
      denseRank: 5,
      userId: 'user-42',
      displayName: 'Bob the Builder',
      avatarUrl: null,
    })
    render(<LeaderboardEntryRow entry={entry} isAuthenticated={false} />)

    expect(screen.getByLabelText('Rank 7')).toBeInTheDocument()
    expect(screen.getByLabelText('Dense rank 5')).toBeInTheDocument()
    expect(screen.getByText('Bob the Builder')).toBeInTheDocument()
    // Avatar fallback letter is the first uppercase letter of the name.
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('shows the "Tied" indicator only when `isTied === true`', () => {
    const entryTied = makeEntry({ isTied: true })
    const entryNotTied = makeEntry({ userId: 'user-2', isTied: false })

    const { rerender } = render(
      <LeaderboardEntryRow entry={entryTied} isAuthenticated={false} />,
    )
    expect(screen.getByText('Tied')).toBeInTheDocument()

    rerender(<LeaderboardEntryRow entry={entryNotTied} isAuthenticated={false} />)
    expect(screen.queryByText('Tied')).not.toBeInTheDocument()
  })
})
