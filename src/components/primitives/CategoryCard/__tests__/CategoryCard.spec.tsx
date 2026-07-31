/**
 * <CategoryCard /> unit tests.
 *
 * Source story: PHASE_3_EPICS.md → Story 3.1.
 * Source ticket: TKT-3.1.E3.
 *
 * Covers the happy path + the four Story 3.1 edge cases (no imageUrl,
 * long name, no description, slug-vs-id navigation).
 *
 * Mocks `next/link` to render a plain anchor so the unit layer doesn't
 * need the Next.js runtime.
 */

import { describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}))

import { render, screen } from '@testing-library/react'

import { CategoryCard } from '../CategoryCard'
import { mockCategoryResponseDto } from '../../__tests__/render-helpers'

describe('CategoryCard', () => {
  it('renders the happy path with name, image, and description', () => {
    render(
      <CategoryCard
        category={mockCategoryResponseDto({
          name: 'Mathematics',
          description: 'All math quizzes.',
          imageUrl: 'https://example.test/cat.jpg'
        })}
      />
    )

    const card = screen.getByTestId('category-card')
    expect(card.tagName.toLowerCase()).toBe('a')
    expect(card.getAttribute('href')).toBe(
      '/categories/' + mockCategoryResponseDto().slug
    )
    expect(
      screen.getByRole('heading', { name: /mathematics/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/all math quizzes/i)).toBeInTheDocument()
  })

  it('renders deterministic initials when imageUrl is missing', () => {
    render(
      <CategoryCard
        category={mockCategoryResponseDto({
          name: 'No image category',
          imageUrl: null
        })}
      />
    )
    const card = screen.getByTestId('category-card')
    expect(card.textContent).toMatch(/[A-Z0-9]{2}/)
    expect(card.querySelector('img')).toBeNull()
  })

  it('clamps a long name to two lines and exposes the full name as aria-label', () => {
    const longName =
      'A very very very very very very very very very very long category name'
    render(
      <CategoryCard category={mockCategoryResponseDto({ name: longName })} />
    )
    const card = screen.getByTestId('category-card')
    expect(card.getAttribute('aria-label')).toBe(longName)
    const heading = screen.getByRole('heading', { name: longName })
    expect(heading.className).toMatch(/line-clamp-2/)
  })

  it('omits the description row when description is null', () => {
    render(
      <CategoryCard
        category={mockCategoryResponseDto({ description: null })}
      />
    )
    expect(
      screen.queryByText(/all math quizzes/i, { selector: 'p' })
    ).not.toBeInTheDocument()
  })

  it('navigates by id when slug is empty (slug-vs-id rule)', () => {
    const category = mockCategoryResponseDto({ slug: '' })
    render(<CategoryCard category={category} />)
    const card = screen.getByTestId('category-card')
    expect(card.getAttribute('href')).toBe(`/categories/${category.categoryId}`)
    expect(card.getAttribute('data-category-slug')).toBe('')
    expect(card.getAttribute('data-category-id')).toBe(category.categoryId)
  })
})