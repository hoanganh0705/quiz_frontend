

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'

import { QuizRelatedQuizzesSkeleton } from '@/features/quizzes/components/QuizRelatedQuizzesSkeleton'

afterEach(() => {
cleanup()
})

describe('QuizRelatedQuizzesSkeleton', () => {
it('renders 4 card skeletons in a 4-column grid (CLS-zero lock)', () => {
render(<QuizRelatedQuizzesSkeleton />)

expect(
screen.getByRole('heading', { level: 2, name: 'Related quizzes' }),
    ).toHaveAttribute('id', 'quiz-related-heading')

const grid = screen.getByTestId('quiz-related-quizzes-skeleton-grid')
expect(grid.className).toMatch(/grid-cols-1/)
expect(grid.className).toMatch(/sm:grid-cols-2/)
expect(grid.className).toMatch(/lg:grid-cols-4/)
expect(grid.className).toMatch(/gap-4/)

expect(within(grid).getAllByTestId('quiz-card-skeleton')).toHaveLength(
4,
    )
  })

it('does not fabricate links or quiz IDs in the loading state', () => {
const { container } = render(<QuizRelatedQuizzesSkeleton />)

expect(container.querySelector('a')).toBeNull()
expect(container.querySelector('[data-quiz-id]')).toBeNull()
  })
})
