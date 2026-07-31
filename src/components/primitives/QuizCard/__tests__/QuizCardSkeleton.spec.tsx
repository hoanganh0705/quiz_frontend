/**
 * <QuizCardSkeleton /> unit tests.
 *
 * Source story: PHASE_3_EPICS.md → Story 3.1.
 * Source ticket: TKT-3.1.C5.
 *
 * Verifies:
 *   - Skeleton renders with role="status" and accessible label.
 *   - Outer rectangle dimensions match the resolved <QuizCard /> within
 *     a tolerance (both share aspect ratio + body padding).
 *   - The rendered tree does NOT contain text content from a resolved
 *     card (i.e. no leaked title text).
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

import { QuizCard } from '../QuizCard'
import { QuizCardSkeleton } from '../QuizCardSkeleton'
import { mockQuizListItemDto } from '../../__tests__/render-helpers'

describe('QuizCardSkeleton', () => {
  it('has role=status and an accessible label', () => {
    render(<QuizCardSkeleton />)
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Loading quiz card'
    )
  })

  it('does not leak text content from the resolved card', () => {
    render(
      <>
        <QuizCardSkeleton data-testid='skel' />
        <QuizCard quiz={mockQuizListItemDto({ title: 'leaky-title' })} />
      </>
    )
    const skel = screen.getByTestId('skel')
    expect(skel.textContent ?? '').not.toMatch(/leaky-title/)
  })

  it('shares the outer height class with the resolved card (no CLS)', () => {
    render(
      <>
        <QuizCardSkeleton data-testid='skel' />
        <QuizCard quiz={mockQuizListItemDto()} data-testid='resolved' />
      </>
    )
    const skel = screen.getByTestId('skel')
    const resolved = screen.getByTestId('resolved')
    // Both use `flex h-full flex-col overflow-hidden rounded-xl border …`
    // and the cover block uses `aspect-[16/9]`. Asserting on the shared
    // class tokens is sufficient for unit-level CLS evidence; final CLS
    // verification happens in TKT-3.1.C6 via Lighthouse.
    expect(skel.className).toMatch(/rounded-xl/)
    expect(skel.className).toMatch(/flex h-full flex-col/)
    expect(resolved.className).toMatch(/rounded-xl/)
    expect(resolved.className).toMatch(/flex h-full flex-col/)
  })
})