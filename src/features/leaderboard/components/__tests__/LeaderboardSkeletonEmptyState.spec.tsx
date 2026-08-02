/**
 * `LeaderboardSkeleton.spec.tsx` + `LeaderboardEmptyState.spec.tsx` —
 * locks the loading-state and empty-state component contracts.
 *
 * Source epic:   Epic 3.11 — `/leaderboard` read-only render.
 * Source ticket: TKT-3.11.B4.
 *
 * `LeaderboardSkeleton` cases:
 *   (1) Default count is 10 (CLS = 0 invariant).
 *   (2) `count` prop overrides the default.
 *   (3) The outer dimensions match the live table's outer
 *       dimensions (card border + rounded-lg + overflow-hidden).
 *
 * `LeaderboardEmptyState` cases:
 *   (1) Empty-state copy matches the canonical text from
 *       `PHASE_3_EPICS.md` line 1198.
 *   (2) `Retry` button is rendered when `onRetry` is provided.
 *   (3) `Retry` button is NOT rendered when `onRetry` is omitted.
 *   (4) `Retry` button invokes `onRetry` on click.
 */

import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { LeaderboardSkeleton } from '@/features/leaderboard/components/LeaderboardSkeleton'
import { LeaderboardEmptyState } from '@/features/leaderboard/components/LeaderboardEmptyState'

// ──────────────────────────────────────────────────────────────────────
// LeaderboardSkeleton
// ──────────────────────────────────────────────────────────────────────

describe('LeaderboardSkeleton — row count', () => {
  it('renders 10 rows by default (CLS = 0 invariant)', () => {
    render(<LeaderboardSkeleton />)
    // The skeleton renders 10 `LeaderboardRowSkeleton` children. Each
    // is a `<div>` with `bg-slate-800/30`. Count those.
    const skeleton = screen.getByTestId('leaderboard-skeleton')
    const rows = skeleton.querySelectorAll('[data-slot="skeleton"]')
    // 6 skeleton pieces per row (rank, avatar, name-1, name-2,
    // xp-badge, xp-pill) × 10 rows = 60 skeleton pieces. This is a
    // stable invariant — the composition depends on it for CLS = 0.
    expect(rows.length).toBe(60)
  })

  it('honors the `count` prop', () => {
    render(<LeaderboardSkeleton count={3} />)
    const skeleton = screen.getByTestId('leaderboard-skeleton')
    const rows = skeleton.querySelectorAll('[data-slot="skeleton"]')
    expect(rows.length).toBe(18) // 3 rows × 6 skeleton pieces
  })

  it('exposes the loading state via `role="status"` and `aria-live`', () => {
    render(<LeaderboardSkeleton />)
    const skeleton = screen.getByRole('status')
    expect(skeleton).toHaveAttribute('aria-live', 'polite')
    expect(skeleton).toHaveAccessibleName(/loading leaderboard/i)
  })
})

describe('LeaderboardSkeleton — outer dimensions', () => {
  it('uses the same outer card chrome as the live table', () => {
    render(<LeaderboardSkeleton />)
    const skeleton = screen.getByTestId('leaderboard-skeleton')
    expect(skeleton.className).toContain('bg-card')
    expect(skeleton.className).toContain('border')
    expect(skeleton.className).toContain('rounded-lg')
    expect(skeleton.className).toContain('overflow-hidden')
  })
})

// ──────────────────────────────────────────────────────────────────────
// LeaderboardEmptyState
// ──────────────────────────────────────────────────────────────────────

const LEADERBOARD_EMPTY_COPY =
  'No leaderboard data yet — play some quizzes to populate the ranks.'

describe('LeaderboardEmptyState — copy', () => {
  it('renders the canonical empty-state copy from PHASE_3_EPICS.md line 1198', () => {
    render(<LeaderboardEmptyState />)
    expect(screen.getByText(LEADERBOARD_EMPTY_COPY)).toBeInTheDocument()
  })

  it('renders a title for the empty state', () => {
    render(<LeaderboardEmptyState />)
    // Title is "Leaderboard is empty" per the component contract.
    expect(screen.getByText('Leaderboard is empty')).toBeInTheDocument()
  })
})

describe('LeaderboardEmptyState — retry button', () => {
  it('renders a `Retry` button when `onRetry` is provided', () => {
    const onRetry = vi.fn()
    render(<LeaderboardEmptyState onRetry={onRetry} />)
    expect(
      screen.getByRole('button', { name: 'Retry' }),
    ).toBeInTheDocument()
  })

  it('does NOT render a `Retry` button when `onRetry` is omitted', () => {
    render(<LeaderboardEmptyState />)
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
  })

  it('invokes `onRetry` when the `Retry` button is clicked', () => {
    const onRetry = vi.fn()
    render(<LeaderboardEmptyState onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})

describe('LeaderboardEmptyState — outer dimensions', () => {
  it('uses the same outer card chrome as the live table', () => {
    render(<LeaderboardEmptyState />)
    const empty = screen.getByTestId('leaderboard-empty-state')
    expect(empty.className).toContain('bg-card')
    expect(empty.className).toContain('border')
    expect(empty.className).toContain('rounded-lg')
    expect(empty.className).toContain('overflow-hidden')
  })
})
