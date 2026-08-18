

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
        <QuizCard quiz={mockQuizListItemDto()} />
      </>
    )
    const skel = screen.getByTestId('skel')
    const resolved = screen.getByTestId('quiz-card')

    expect(skel.className).toMatch(/rounded-xl/)
    expect(skel.className).toMatch(/flex h-full flex-col/)
    expect(resolved.className).toMatch(/rounded-xl/)
    expect(resolved.className).toMatch(/flex h-full flex-col/)
  })
})