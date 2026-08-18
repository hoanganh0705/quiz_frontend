

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
  ),
}))

import { render, screen } from '@testing-library/react'

import { CategoryCard } from '@/features/categories/components/CategoryCard'
import { mockCategoryResponseDto } from '@/components/primitives/__tests__/render-helpers'

describe('CategoryCard wrapper', () => {
it('renders the Story 3.1 primitive with the URL key = slug', () => {
const category = mockCategoryResponseDto({
name: 'Mathematics',
slug: 'mathematics',
    })
render(<CategoryCard category={category} />)

const card = screen.getByTestId('category-card')
expect(card.tagName.toLowerCase()).toBe('a')
expect(card.getAttribute('href')).toBe('/categories/mathematics')
expect(card.getAttribute('data-category-id')).toBe(category.categoryId)
expect(card.getAttribute('data-category-slug')).toBe('mathematics')
  })
})
