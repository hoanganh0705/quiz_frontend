/**
 * CategoryCard wrapper — unit spec.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source ticket: TKT-3.3.C1.
 *
 * One case per ticket (TKT-3.3.C1 testing checklist): confirms the
 * wrapper renders the Story 3.1 primitive with the mapped props —
 * i.e. the resolved card is a `<CategoryCard>` with the URL key
 * being `slug || categoryId`.
 *
 * The test reuses the Story 3.1 primitive's existing URL contract
 * (verified by the Story 3.1 spec) — the wrapper is a 1:1 prop
 * adapter, so this is a thin smoke test.
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
