

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
import { mockQuizListItemDto } from '../../__tests__/render-helpers'

function renderQuiz(
props: Parameters<typeof QuizCard>[0] & {
bookmarkSlot?: never
  },
) {
return render(<QuizCard {...props} bookmarkSlot={null} />)
}

describe('QuizCard', () => {
it('renders the happy path with title, image, and metadata badges', () => {
renderQuiz({
quiz: mockQuizListItemDto({
title: 'A friendly quiz',
imageUrl: 'https://example.test/img.jpg',
isFeatured: true,
isVerified: true,
description: 'A short description.',
publishedVersion: {
quizVersionId: '0192f4d8-2222-7000-8000-000000000000',
quizId: '0192f4d8-1111-7000-8000-000000000000',
versionNumber: 1,
status: 'PUBLISHED',
difficulty: 'MEDIUM',
durationMs: 90_000,
passingScorePercent: 60,
rewardXp: 100,
createdAt: '2026-07-01T00:00:00.000Z',
publishedAt: '2026-07-01T00:00:00.000Z',
archivedAt: null,
updatedAt: '2026-07-01T00:00:00.000Z'
        }
      })
    })

const card = screen.getByTestId('quiz-card')
expect(card).toBeInTheDocument()
expect(card.tagName.toLowerCase()).toBe('a')
expect(card.getAttribute('href')).toBe(
'/quizzes/' + mockQuizListItemDto().slug
    )
expect(screen.getByRole('heading', { name: /a friendly quiz/i })).toBeInTheDocument()
expect(screen.getByText(/verified/i)).toBeInTheDocument()
expect(screen.getByText(/featured/i)).toBeInTheDocument()
expect(screen.getByText('MEDIUM')).toBeInTheDocument()
expect(screen.getByText('1m 30s')).toBeInTheDocument()
  })

it('renders deterministic initials when imageUrl is missing', () => {
renderQuiz({
quiz: mockQuizListItemDto({
imageUrl: null,
title: 'No image quiz'
      })
    })

const card = screen.getByTestId('quiz-card')
expect(card.textContent).toMatch(/[A-Z0-9]{2}/)
expect(card.querySelector('img')).toBeNull()
  })

it('clamps a long title to two lines while keeping the full title as the accessible name', () => {
    const longTitle =
      'A very very very very very very very very very very long quiz title that exceeds the line clamp'
    renderQuiz({
      quiz: mockQuizListItemDto({ title: longTitle })
    })

    const heading = screen.getByRole('heading', { name: longTitle })
    expect(heading.className).toMatch(/line-clamp-2/)
    expect(heading.textContent).toBe(longTitle)
  })

it('omits the description row when description is null', () => {
renderQuiz({
quiz: mockQuizListItemDto({ description: null })
    })

expect(
screen.queryByText(/description/i, { selector: 'p' })
    ).not.toBeInTheDocument()
  })

it('navigates by id when slug is empty (slug-vs-id rule)', () => {
const quiz = mockQuizListItemDto({ slug: '' })
renderQuiz({ quiz })

const card = screen.getByTestId('quiz-card')
expect(card.getAttribute('href')).toBe(`/quizzes/${quiz.quizId}`)
expect(card.getAttribute('data-quiz-slug')).toBe('')
expect(card.getAttribute('data-quiz-id')).toBe(quiz.quizId)
  })
})