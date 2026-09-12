/**
 * Unit tests for `KnowledgeBase` — Phase 4.2 regression guard.
 *
 * Specifically asserts that:
 *   - On a successful fetch, the article grid renders the API data.
 *   - On a search, the list filters client-side.
 *   - On an error, the component renders an error state with a
 *     retry button — and **does not** fall back to a static fixture
 *     (this is the F-6 regression guard).
 *   - On retry, the error clears and a fresh fetch is issued.
 *
 * The `getSupportArticles` API is mocked so the tests do not require
 * a running backend.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { KnowledgeBase } from '../KnowledgeBase'

vi.mock('@/features/support/api', () => ({
  getSupportArticles: vi.fn(),
}))

import { getSupportArticles } from '@/features/support/api'

const mockFetch = getSupportArticles as unknown as ReturnType<typeof vi.fn>

const SAMPLE_ARTICLES = [
  {
    id: 'a1',
    title: 'How to reset your password',
    slug: 'reset-password',
    category: 'Account',
    excerpt: 'Step-by-step guide.',
    icon: 'user',
    readTime: '3 min',
  },
  {
    id: 'a2',
    title: 'Getting started with quizzes',
    slug: 'getting-started',
    category: 'Quizzes',
    excerpt: 'Build your first quiz in 5 minutes.',
    icon: 'book-open',
    readTime: '5 min',
  },
]

describe('KnowledgeBase', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    mockFetch.mockReset()
  })

  it('renders the article grid on success', async () => {
    mockFetch.mockResolvedValue(SAMPLE_ARTICLES)
    render(<KnowledgeBase />)
    await waitFor(() => {
      expect(screen.getByText('How to reset your password')).toBeInTheDocument()
    })
    expect(screen.getByText('Getting started with quizzes')).toBeInTheDocument()
  })

  it('filters articles by search query', async () => {
    mockFetch.mockResolvedValue(SAMPLE_ARTICLES)
    render(<KnowledgeBase />)
    await waitFor(() => {
      expect(screen.getByText('How to reset your password')).toBeInTheDocument()
    })
    const search = screen.getByLabelText('Search articles')
    fireEvent.change(search, { target: { value: 'password' } })
    expect(screen.getByText('How to reset your password')).toBeInTheDocument()
    expect(screen.queryByText('Getting started with quizzes')).not.toBeInTheDocument()
  })

  it('does NOT render a fallback list of static articles on error (regression guard for F-6)', async () => {
    mockFetch.mockRejectedValue(new Error('Network unreachable'))
    render(<KnowledgeBase />)
    await waitFor(() => {
      expect(screen.getByTestId('kb-error')).toBeInTheDocument()
    })
    // The static articles must not appear.
    expect(screen.queryByText('How to reset your password')).not.toBeInTheDocument()
    expect(screen.queryByText('Getting started with quizzes')).not.toBeInTheDocument()
  })

  it('renders a retry button on error that re-issues the fetch', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network unreachable'))
    mockFetch.mockResolvedValueOnce(SAMPLE_ARTICLES)
    render(<KnowledgeBase />)
    await waitFor(() => {
      expect(screen.getByTestId('kb-error')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('kb-retry'))
    await waitFor(() => {
      expect(screen.getByText('How to reset your password')).toBeInTheDocument()
    })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('renders an empty-state when the API returns zero articles', async () => {
    mockFetch.mockResolvedValue([])
    render(<KnowledgeBase />)
    await waitFor(() => {
      expect(
        screen.getByText('No articles found matching your search.'),
      ).toBeInTheDocument()
    })
  })
})
