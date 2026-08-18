

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'

import { ApiError } from '@/lib/api'
import type { QuizListItemDto } from '@/lib/api/generated/schemas'

import { QuizRelatedQuizzes } from '@/features/quizzes/components/QuizRelatedQuizzes'

const useQuizRelatedMock = vi.fn()

vi.mock('@/features/quizzes/hooks/useQuizRelated', async () => {
const actual =
await vi.importActual<
typeof import('@/features/quizzes/hooks/useQuizRelated')
    >('@/features/quizzes/hooks/useQuizRelated')
return {
...actual,
useQuizRelated: (...args: unknown[]) => useQuizRelatedMock(...args),
  }
})

function makeQuizItem(index: number): QuizListItemDto {
return {
quizId: `0192f4d8-0000-7000-8000-${String(index).padStart(12, '0')}`,
creatorId: null,
creator: {
userId: '0192f4d8-0000-7000-8000-000000000002',
username: 'testuser',
displayName: 'Test User',
avatarUrl: null,
    },
title: `Related Quiz ${index}`,
description: null,
slug: `related-quiz-${index}`,
requirements: null,
imageUrl: null,
categoryId: null,
categoryName: null,
categorySlug: null,
isFeatured: false,
isHidden: false,
isVerified: false,
publishedVersionId: null,
createdAt: '2026-07-01T00:00:00.000Z',
updatedAt: '2026-07-01T00:00:00.000Z',
questionCount: 10,
averageRating: 4.0,
reviewCount: 5,
attemptCount: 50,
tags: [],
  }
}

function makeApiError(status: number, code = `CODE_${status}`): ApiError {
return new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: `Mock ${status}`,
code,
config: undefined,
request: undefined,
response: {
status,
data: { code, detail: 'fixture' },
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0])
}

afterEach(() => {
cleanup()
useQuizRelatedMock.mockReset()
})

describe('QuizRelatedQuizzes — loading', () => {
it('renders the heading and 4 card skeletons when isLoading=true', () => {
useQuizRelatedMock.mockReturnValue({
items: [],
isLoading: true,
error: null,
notFound: false,
    })

render(<QuizRelatedQuizzes idOrSlug='quiz-abc' />)

expect(
screen.getByRole('heading', { level: 2, name: 'Related quizzes' }),
    ).toBeInTheDocument()

const grid = screen.getByTestId('quiz-related-quizzes-skeleton-grid')
expect(grid.className).toMatch(/lg:grid-cols-4/)
expect(within(grid).getAllByTestId('quiz-card-skeleton')).toHaveLength(
4,
    )
  })
})

describe('QuizRelatedQuizzes — empty', () => {
it('returns null (no `<section>` in the DOM) when items=[] and notFound=false', () => {
useQuizRelatedMock.mockReturnValue({
items: [],
isLoading: false,
error: null,
notFound: false,
    })

const { container } = render(<QuizRelatedQuizzes idOrSlug='quiz-empty' />)

expect(
screen.queryByRole('heading', { level: 2, name: 'Related quizzes' }),
    ).toBeNull()
expect(container.querySelector('[data-testid="quiz-related-quizzes"]'))
      .toBeNull()
expect(
container.querySelector(
'[data-testid="quiz-related-quizzes-skeleton"]',
      ),
    ).toBeNull()
  })
})

describe('QuizRelatedQuizzes — 404 (notFound)', () => {
it('returns null when notFound=true', () => {
useQuizRelatedMock.mockReturnValue({
items: [],
isLoading: false,
error: null,
notFound: true,
    })

const { container } = render(<QuizRelatedQuizzes idOrSlug='quiz-404' />)

expect(
screen.queryByRole('heading', { level: 2, name: 'Related quizzes' }),
    ).toBeNull()
expect(container.querySelector('[data-testid="quiz-related-quizzes"]'))
      .toBeNull()
  })
})

describe('QuizRelatedQuizzes — 5xx (error)', () => {
it('returns null when error is populated with an ApiError; no toast / no skeleton', () => {
useQuizRelatedMock.mockReturnValue({
items: [],
isLoading: false,
error: makeApiError(500, 'INTERNAL'),
notFound: false,
    })

const { container } = render(<QuizRelatedQuizzes idOrSlug='quiz-500' />)

expect(
screen.queryByRole('heading', { level: 2, name: 'Related quizzes' }),
    ).toBeNull()
expect(container.querySelector('[data-testid="quiz-related-quizzes"]'))
      .toBeNull()

expect(
container.querySelector(
'[data-testid="quiz-related-quizzes-skeleton"]',
      ),
    ).toBeNull()
expect(container.querySelector('[role="alert"]')).toBeNull()
  })

it('does NOT call console.error or console.warn on a 5xx (silent failure contract)', () => {
const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

useQuizRelatedMock.mockReturnValue({
items: [],
isLoading: false,
error: makeApiError(500, 'INTERNAL'),
notFound: false,
    })

render(<QuizRelatedQuizzes idOrSlug='quiz-silent' />)

expect(errorSpy).not.toHaveBeenCalled()
expect(warnSpy).not.toHaveBeenCalled()

errorSpy.mockRestore()
warnSpy.mockRestore()
  })
})

describe('QuizRelatedQuizzes — happy path', () => {
it('renders the heading + 4 QuizCards in the order returned by the hook', () => {
const items: QuizListItemDto[] = [
makeQuizItem(1),
makeQuizItem(2),
makeQuizItem(3),
makeQuizItem(4),
    ]
useQuizRelatedMock.mockReturnValue({
items,
isLoading: false,
error: null,
notFound: false,
    })

render(<QuizRelatedQuizzes idOrSlug='quiz-happy' />)

const heading = screen.getByRole('heading', {
level: 2,
name: 'Related quizzes',
    })
expect(heading).toBeInTheDocument()
expect(heading).toHaveAttribute('id', 'quiz-related-heading')

const section = screen.getByTestId('quiz-related-quizzes')
const cards = within(section).getAllByTestId('quiz-card')
expect(cards).toHaveLength(4)

const titles = cards.map((c) => c.getAttribute('aria-label'))
expect(titles).toEqual([
'Related Quiz 1',
'Related Quiz 2',
'Related Quiz 3',
'Related Quiz 4',
    ])
  })

it('caps the rendered cards at QUIZ_RELATED_LIMIT even when the hook returns more', () => {
const items: QuizListItemDto[] = Array.from({ length: 8 }, (_, i) =>
makeQuizItem(i + 1),
    )
useQuizRelatedMock.mockReturnValue({
items,
isLoading: false,
error: null,
notFound: false,
    })

render(<QuizRelatedQuizzes idOrSlug='quiz-cap' />)

const section = screen.getByTestId('quiz-related-quizzes')

expect(within(section).getAllByTestId('quiz-card')).toHaveLength(4)
  })
})
