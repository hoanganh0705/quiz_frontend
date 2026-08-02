/**
 * `DailyChallengeHistoryList.spec.tsx` — locks the list and the
 * delegation to the empty-state surface (TKT-3.12.B3).
 *
 * Four cases per the ticket's testing checklist:
 *
 *   (1) Renders the days per row (date, category, score, rank) when
 *       items is non-empty.
 *   (2) Delegates to `<DailyChallengeHistoryEmptyState />` when
 *       items is empty (the list and the empty state are
 *       mutually exclusive at the same render depth).
 *   (3) The "View All" button is rendered when `hasMore` is true and
 *       `onLoadMore` is provided; it is omitted when there are no
 *       more pages.
 *   (4) The list has `role="region"` and `aria-labelledby` so screen
 *       readers can navigate to it as a landmark.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import { DailyChallengeHistoryList } from '@/features/daily-challenge/components/DailyChallengeHistoryList'

afterEach(() => {
  cleanup()
})

const items = [
  {
    id: 'a',
    date: '2026-08-01T00:00:00.000Z',
    category: 'Science',
    score: 80,
    rank: 1,
    isTopTen: true,
  },
  {
    id: 'b',
    date: '2026-07-31T00:00:00.000Z',
    category: 'History',
    score: 60,
    rank: 12,
    isTopTen: false,
  },
  {
    id: 'c',
    date: '2026-07-30T00:00:00.000Z',
    category: 'Geography',
    score: 70,
    rank: 5,
    isTopTen: true,
  },
  {
    id: 'd',
    date: '2026-07-29T00:00:00.000Z',
    category: 'Art',
    score: 90,
    rank: 2,
    isTopTen: true,
  },
]

describe('DailyChallengeHistoryList — render', () => {
  it('(1) renders the date, category, score, and rank for each row', () => {
    render(
      <DailyChallengeHistoryList
        items={items}
        hasMore={false}
        isLoadingMore={false}
      />,
    )
    expect(
      screen.getByText('2026-08-01T00:00:00.000Z'),
    ).toBeInTheDocument()
    expect(screen.getByText('Science')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('Rank #1')).toBeInTheDocument()
    expect(screen.getAllByText('Top 10').length).toBeGreaterThanOrEqual(1)
  })

  it('(2) delegates to the empty state when items is empty', () => {
    render(
      <DailyChallengeHistoryList
        items={[]}
        hasMore={false}
        isLoadingMore={false}
      />,
    )
    expect(
      screen.getByTestId('daily-challenge-history-empty-state'),
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId('daily-challenge-history-list'),
    ).toBeNull()
  })

  it('(3) renders the "View All" button when hasMore is true and onLoadMore is provided', () => {
    const handleLoadMore = vi.fn()
    render(
      <DailyChallengeHistoryList
        items={items}
        hasMore={true}
        isLoadingMore={false}
        onLoadMore={handleLoadMore}
      />,
    )
    expect(
      screen.getByLabelText(/Load \d+ more past challenges/),
    ).toBeInTheDocument()
  })

  it('(3b) omits the "View All" button when hasMore is false and items.length <= 3', () => {
    render(
      <DailyChallengeHistoryList
        items={items.slice(0, 2)}
        hasMore={false}
        isLoadingMore={false}
        onLoadMore={vi.fn()}
      />,
    )
    expect(
      screen.queryByLabelText(/Load \d+ more past challenges/),
    ).toBeNull()
  })

  it('(4) renders with role="region" and a stable aria-labelledby', () => {
    render(
      <DailyChallengeHistoryList
        items={items}
        hasMore={false}
        isLoadingMore={false}
      />,
    )
    const list = screen.getByTestId('daily-challenge-history-list')
    expect(list).toHaveAttribute('role', 'region')
    expect(list).toHaveAttribute(
      'aria-labelledby',
      'daily-challenge-history-title',
    )
  })
})
