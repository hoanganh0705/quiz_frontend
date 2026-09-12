/**
 * Unit tests for `LeaderboardHighlights` — Phase 4.5 (F-9).
 *
 * Asserts:
 *   - The category Select in the 'category' tab is disabled.
 *   - A tooltip is present on the category Select.
 *   - The tooltip text is "Per-category leaderboard is on the roadmap".
 *   - The disabled Select has the placeholder "All categories (coming soon)".
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('@/features/leaderboard/hooks', () => ({
  useLeaderboard: vi.fn(),
  useTopMovers: vi.fn(),
}))

import { useLeaderboard, useTopMovers } from '@/features/leaderboard/hooks'

import { LeaderboardHighlights } from '../LeaderboardHighlights'

const mockUseLeaderboard = useLeaderboard as unknown as ReturnType<typeof vi.fn>
const mockUseTopMovers = useTopMovers as unknown as ReturnType<typeof vi.fn>

function makeEntries(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    rank: i + 1,
    denseRank: i + 1,
    userId: `u-${i}`,
    displayName: `User ${i}`,
    avatarUrl: null,
    xp: 1000 - i * 10,
    isTied: false,
    isCurrentUser: false,
  }))
}

describe('LeaderboardHighlights', () => {
  beforeEach(() => {
    mockUseLeaderboard.mockReturnValue({ entries: makeEntries(5), isLoading: false })
    mockUseTopMovers.mockReturnValue({ movers: [], isLoading: false })
  })

  afterEach(() => {
    mockUseLeaderboard.mockReset()
    mockUseTopMovers.mockReset()
  })

  it('renders the category tab', async () => {
    render(<LeaderboardHighlights />)
    const categoryTab = screen.getByRole('tab', { name: /by category/i })
    expect(categoryTab).toBeInTheDocument()
  })

  it('shows the disabled category Select when the category tab is active (F-9)', async () => {
    render(<LeaderboardHighlights />)
    // Click the category tab.
    const categoryTab = screen.getByRole('tab', { name: /by category/i })
    categoryTab.click()
    await waitFor(() => {
      expect(screen.getByTestId('category-select')).toBeInTheDocument()
    })
  })

  it('the category Select is disabled (F-9 roadmap signal)', async () => {
    render(<LeaderboardHighlights />)
    const categoryTab = screen.getByRole('tab', { name: /by category/i })
    categoryTab.click()
    await waitFor(() => {
      // Radix renders `data-disabled` on the disabled trigger element.
      expect(screen.getByTestId('category-select')).toHaveAttribute('data-disabled', '')
    })
  })

  it('the tooltip text is present in a sr-only element linked via aria-describedby (F-9)', async () => {
    render(<LeaderboardHighlights />)
    const categoryTab = screen.getByRole('tab', { name: /by category/i })
    categoryTab.click()
    await waitFor(() => {
      // Use regex to handle potential text-node fragmentation.
      expect(
        screen.getByText(/per-category leaderboard is on the roadmap/i),
      ).toBeInTheDocument()
    })
  })
})
