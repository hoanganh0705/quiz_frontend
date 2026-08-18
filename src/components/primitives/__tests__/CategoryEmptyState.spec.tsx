

import { describe, expect, it } from 'vitest'

import { render, screen } from '@testing-library/react'

import { CategoryEmptyState } from '@/features/categories/components/CategoryEmptyState'

describe('CategoryEmptyState', () => {
it('renders the documented copy for the "directory" variant', () => {
render(<CategoryEmptyState variant='directory' />)
const container = screen.getByTestId('category-empty-state-directory')
expect(container).toBeInTheDocument()
expect(container.getAttribute('data-variant')).toBe('directory')
expect(screen.getByText(/no categories yet/i)).toBeInTheDocument()
  })

it('renders the documented copy for the "quizzes-in-category" variant', () => {
render(<CategoryEmptyState variant='quizzes-in-category' />)
const container = screen.getByTestId(
'category-empty-state-quizzes-in-category',
    )
expect(container).toBeInTheDocument()
expect(container.getAttribute('data-variant')).toBe('quizzes-in-category')
expect(
screen.getByText(/no quizzes in this category yet/i),
    ).toBeInTheDocument()
  })
})
