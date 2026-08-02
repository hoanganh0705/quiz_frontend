/**
 * <QuizCard /> unit tests.
 *
 * Source story: PHASE_3_EPICS.md → Story 3.1.
 * Source ticket: TKT-3.1.C4.
 *
 * Covers the happy path + the four Story 3.1 edge cases (no imageUrl,
 * long title, missing description, id-only entity with no slug).
 *
 * The Story 3.10 / TKT-3.10.E1 bookmark integration has its own focused
 * test file (`quiz-card-bookmark-slot.spec.tsx`) so the Story 3.1
 * assertions here can run without the SWR / SDK / auth mocking that
 * the slot requires. We pass `bookmarkSlot={null}` here so the test
 * renders the canonical Story 3.1 surface without a real
 * `<BookmarkButtonSlot />` mounted.
 *
 * Mocks `next/link` to render a plain anchor so we don't need the
 * Next.js runtime in the unit layer (jsdom does not provide one).
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
import { mockQuizListItemDto } from '../../__tests__/render-helpers'

/**
 * Story 3.1 — render the canonical card with no bookmark slot. The
 * Story 3.10 integration is verified in the dedicated spec file.
 */
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

    // The initials span has aria-hidden, so we look it up by data-testid.
    const card = screen.getByTestId('quiz-card')
    expect(card.textContent).toMatch(/[A-Z0-9]{2}/)
    expect(card.querySelector('img')).toBeNull()
  })

  it('clamps a long title to two lines and exposes the full title as aria-label', () => {
    const longTitle =
      'A very very very very very very very very very very long quiz title that exceeds the line clamp'
    renderQuiz({
      quiz: mockQuizListItemDto({ title: longTitle })
    })

    const card = screen.getByTestId('quiz-card')
    expect(card.getAttribute('aria-label')).toBe(longTitle)
    const heading = screen.getByRole('heading', { name: longTitle })
    expect(heading.className).toMatch(/line-clamp-2/)
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