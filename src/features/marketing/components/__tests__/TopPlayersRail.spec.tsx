/**
 * Unit tests for `TopPlayersRail` (Phase 4.3 — F-7 replacement for
 * `SuccessStoriesCarousel`).
 *
 * Coverage:
 *   - Renders a skeleton while loading.
 *   - Renders the populated rail when `useHomeBundle` returns ≥1 entry.
 *   - Limits the rail to the top 5 entries (`TOP_N`).
 *   - Renders the empty state when `topPlayers` is empty.
 *   - Renders the error state when the home bundle fetch fails.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('@/features/quizzes/hooks/useHomeBundle', () => ({
  useHomeBundle: vi.fn(),
}))

import { useHomeBundle } from '@/features/quizzes/hooks/useHomeBundle'

import { TopPlayersRail } from '../TopPlayersRail'

const mockUseHomeBundle = useHomeBundle as unknown as ReturnType<typeof vi.fn>

function makePlayer(rank: number, displayName: string, xp: number) {
  return {
    rank,
    denseRank: rank,
    userId: `u-${rank}`,
    displayName,
    avatarUrl: null,
    xp,
    isTied: false,
    isCurrentUser: false,
  }
}

describe('TopPlayersRail', () => {
  beforeEach(() => {
    mockUseHomeBundle.mockReset()
  })

  afterEach(() => {
    mockUseHomeBundle.mockReset()
  })

  it('renders the skeleton while loading', () => {
    mockUseHomeBundle.mockReturnValue({
      topPlayers: [],
      isLoading: true,
      error: null,
    })
    render(<TopPlayersRail />)
    expect(screen.getByTestId('top-players-rail-skeleton')).toBeInTheDocument()
  })

  it('renders the populated rail when topPlayers has entries', async () => {
    mockUseHomeBundle.mockReturnValue({
      topPlayers: [
        makePlayer(1, 'Alice', 5000),
        makePlayer(2, 'Bob', 4200),
      ],
      isLoading: false,
      error: null,
    })
    render(<TopPlayersRail />)
    await waitFor(() => {
      expect(screen.getByTestId('top-players-rail-grid')).toBeInTheDocument()
    })
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    // First-place rank label.
    expect(screen.getByLabelText('Rank 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Rank 2')).toBeInTheDocument()
  })

  it('caps the rail at 5 entries (top N)', () => {
    mockUseHomeBundle.mockReturnValue({
      topPlayers: [
        makePlayer(1, 'A', 100),
        makePlayer(2, 'B', 90),
        makePlayer(3, 'C', 80),
        makePlayer(4, 'D', 70),
        makePlayer(5, 'E', 60),
        makePlayer(6, 'F', 50),
        makePlayer(7, 'G', 40),
      ],
      isLoading: false,
      error: null,
    })
    render(<TopPlayersRail />)
    const cards = screen.getAllByTestId('top-players-rail-card')
    expect(cards).toHaveLength(5)
    // The 6th and 7th entries must not appear.
    expect(screen.queryByText('F')).not.toBeInTheDocument()
    expect(screen.queryByText('G')).not.toBeInTheDocument()
  })

  it('renders the empty state when topPlayers is empty', () => {
    mockUseHomeBundle.mockReturnValue({
      topPlayers: [],
      isLoading: false,
      error: null,
    })
    render(<TopPlayersRail />)
    expect(screen.getByTestId('top-players-rail-empty')).toBeInTheDocument()
  })

  it('renders the error state when the home bundle fetch fails', () => {
    mockUseHomeBundle.mockReturnValue({
      topPlayers: [],
      isLoading: false,
      error: new Error('Network unreachable'),
    })
    render(<TopPlayersRail />)
    expect(screen.getByTestId('top-players-rail-error')).toBeInTheDocument()
  })

  it('formats XP with locale separators', () => {
    mockUseHomeBundle.mockReturnValue({
      topPlayers: [makePlayer(1, 'A', 123456)],
      isLoading: false,
      error: null,
    })
    render(<TopPlayersRail />)
    // toLocaleString in jsdom uses default locale; just assert the
    // digits are present in some form, not strictly a comma.
    expect(screen.getByText(/123.?456 XP/)).toBeInTheDocument()
  })
})
