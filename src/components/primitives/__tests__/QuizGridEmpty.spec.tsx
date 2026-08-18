

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { QuizGridEmpty } from '@/features/quizzes/components/QuizGridEmpty'

afterEach(() => cleanup())

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
