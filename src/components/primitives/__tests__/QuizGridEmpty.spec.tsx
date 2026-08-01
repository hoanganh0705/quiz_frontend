/**
 * `<QuizGridEmpty />` — snapshot-style assertions for both variants.
 *
 * Source epic: Epic 3.5 — Global quizzes list + filters.
 * Source ticket: TKT-3.5.F1.
 *
 * Locks the two empty-state variants:
 *
 *   (a) `directory-empty` — renders `"No published quizzes yet."`
 *       (verbatim) AND does NOT render a "Reset filters" CTA.
 *   (b) `filters-no-match` — renders `"No quizzes match these
 *       filters. Try removing some filters."` (verbatim) AND a
 *       "Reset filters" CTA that calls `onReset()` when clicked.
 *
 * The exact copy is asserted via `screen.getByText(...)` so the
 * strings cannot drift via accidental whitespace / punctuation
 * changes without the test failing.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { QuizGridEmpty } from '@/features/quizzes/components/QuizGridEmpty'

afterEach(() => cleanup())

// ─── (a) directory-empty variant ─────────────────────────────────────────

describe('QuizGridEmpty — directory-empty variant', () => {
  it('renders the "No published quizzes yet." copy', () => {
    const onReset = vi.fn()
    render(<QuizGridEmpty hasFilters={false} onReset={onReset} />)

    const empty = screen.getByTestId('quiz-grid-empty')
    expect(empty.dataset.variant).toBe('directory-empty')
    expect(
      screen.getByText('No published quizzes yet.')
    ).toBeInTheDocument()
  })

  it('does NOT render a "Reset filters" CTA', () => {
    const onReset = vi.fn()
    render(<QuizGridEmpty hasFilters={false} onReset={onReset} />)

    expect(
      screen.queryByRole('button', { name: /reset filters/i })
    ).not.toBeInTheDocument()
  })
})

// ─── (b) filters-no-match variant ────────────────────────────────────────

describe('QuizGridEmpty — filters-no-match variant', () => {
  it('renders the "No quizzes match these filters" copy', () => {
    const onReset = vi.fn()
    render(<QuizGridEmpty hasFilters={true} onReset={onReset} />)

    const empty = screen.getByTestId('quiz-grid-empty')
    expect(empty.dataset.variant).toBe('filters-no-match')
    expect(
      screen.getByText('No quizzes match these filters.')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Try removing some filters.')
    ).toBeInTheDocument()
  })

  it('renders a "Reset filters" CTA that calls onReset when clicked', () => {
    const onReset = vi.fn()
    render(<QuizGridEmpty hasFilters={true} onReset={onReset} />)

    const resetButton = screen.getByRole('button', { name: /reset filters/i })
    expect(resetButton).toBeInTheDocument()

    fireEvent.click(resetButton)
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
