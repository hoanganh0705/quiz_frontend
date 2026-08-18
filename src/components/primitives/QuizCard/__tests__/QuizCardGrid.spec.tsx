

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

import { QuizCardGrid } from '../QuizCardGrid'
import { mockQuizListItemDto } from '../../__tests__/render-helpers'

function renderGrid<T>(
props: Parameters<typeof QuizCardGrid<T>>[0]
) {
return render(<QuizCardGrid<T> {...props} />)
}

describe('QuizCardGrid', () => {
it('renders the resolved list when items are provided', () => {
const items = [
mockQuizListItemDto({ quizId: '0192f4d8-aaaa-7000-8000-000000000001' }),
mockQuizListItemDto({ quizId: '0192f4d8-aaaa-7000-8000-000000000002' }),
mockQuizListItemDto({ quizId: '0192f4d8-aaaa-7000-8000-000000000003' })
    ]
renderGrid({ items })
expect(screen.getAllByTestId('quiz-card')).toHaveLength(3)
expect(screen.queryAllByTestId('quiz-card-skeleton')).toHaveLength(0)
  })

it('renders skeletons when items is empty and skeletonCount > 0', () => {
renderGrid({ items: [], skeletonCount: 6 })
expect(screen.queryAllByTestId('quiz-card')).toHaveLength(0)
expect(screen.getAllByTestId('quiz-card-skeleton')).toHaveLength(6)
  })

it('renders skeletons when items is undefined and skeletonCount > 0', () => {
renderGrid({ skeletonCount: 4 })
expect(screen.getAllByTestId('quiz-card-skeleton')).toHaveLength(4)
  })

it('resolved list wins when both items and skeletonCount are provided', () => {
const items = [
mockQuizListItemDto({ quizId: '0192f4d8-bbbb-7000-8000-000000000001' })
    ]
renderGrid({ items, skeletonCount: 12 })
expect(screen.getAllByTestId('quiz-card')).toHaveLength(1)
expect(screen.queryAllByTestId('quiz-card-skeleton')).toHaveLength(0)
  })

it('renders an empty grid when neither items nor skeletonCount are provided', () => {
const { container } = renderGrid({})
expect(container.querySelectorAll('[data-testid="quiz-card"]')).toHaveLength(0)
expect(
container.querySelectorAll('[data-testid="quiz-card-skeleton"]')
    ).toHaveLength(0)
  })

it('accepts a custom toQuiz mapper for non-default item shapes', () => {
type Row = { id: string; title: string; slug: string }
const rows: Row[] = [
{ id: '0192f4d8-cccc-7000-8000-000000000001', title: 'mapped-1', slug: 'm1' }
    ]
renderGrid<Row>({
items: rows,
toQuiz: (row: Row) =>
mockQuizListItemDto({
quizId: row.id,
title: row.title,
slug: row.slug
        })
    })
expect(screen.getByText('mapped-1')).toBeInTheDocument()
  })
})