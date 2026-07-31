/**
 * <CategoryCardSkeleton /> unit tests.
 *
 * Source story: PHASE_3_EPICS.md → Story 3.1.
 * Source ticket: TKT-3.1.E3.
 *
 * Verifies the skeleton's outer dimensions and accessible label, plus
 * that the rendered tree does not leak text content from a resolved
 * category card.
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
import { CategoryCardSkeleton } from '../CategoryCardSkeleton'
import { mockCategoryResponseDto } from '../../__tests__/render-helpers'

describe('CategoryCardSkeleton', () => {
  it('has role=status and an accessible label', () => {
    render(<CategoryCardSkeleton />)
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Loading category card'
    )
  })

  it('does not leak text content from the resolved card', () => {
    render(
      <>
        <CategoryCardSkeleton data-testid='skel' />
        <CategoryCard
          category={mockCategoryResponseDto({ name: 'leaky-category' })}
        />
      </>
    )
    const skel = screen.getByTestId('skel')
    expect(skel.textContent ?? '').not.toMatch(/leaky-category/)
  })

  it('shares the outer card class tokens with the resolved card (no CLS)', () => {
    render(
      <>
        <CategoryCardSkeleton data-testid='skel' />
        <CategoryCard category={mockCategoryResponseDto()} data-testid='resolved' />
      </>
    )
    const skel = screen.getByTestId('skel')
    const resolved = screen.getByTestId('resolved')
    expect(skel.className).toMatch(/rounded-xl/)
    expect(skel.className).toMatch(/flex h-full flex-col/)
    expect(resolved.className).toMatch(/rounded-xl/)
    expect(resolved.className).toMatch(/flex h-full flex-col/)
  })
})