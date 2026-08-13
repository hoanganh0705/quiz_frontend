/**
 * `QuizRelatedQuizzes.spec.tsx` — locks the live component's
 * hidden-on-empty / hidden-on-404 / hidden-on-error contract.
 *
 * Source epic: Story 3.8 — Related quizzes block.
 * Source ticket: TKT-3.8.B2 (test surface).
 *
 * Five cases per the ticket's B4 AC #2:
 *
 *   (a) `loading` — hook returns `isLoading: true`, items `[]`
 *       → component renders the heading + 4 `<QuizCardSkeleton />`s
 *       with `data-testid="quiz-card-skeleton"`.
 *   (b) `empty` — hook returns `items: []` → component returns
 *       `null`; `queryByRole('heading', { name: 'Related
 *       quizzes' })` returns `null`.
 *   (c) `404` — hook returns `notFound: true` → component returns
 *       `null` (same as empty).
 *   (d) `5xx` — hook returns `error: ApiError` → component returns
 *       `null`; no `<QuizRelatedQuizzesSkeleton />` is rendered.
 *   (e) `happy path` — hook returns 4 items → component renders
 *       the heading + 4 `<QuizCard />`s in the order returned by
 *       the hook.
 *
 * The hook is mocked (not the wrapper) so the test exercises the
 * component's decision tree without coupling to the SDK shape.
 *
 * Test-environment note: vitest's jsdom project picks up files
 * only under the primitives test dir (per `vitest.config.ts`).
 * This spec therefore lives under that directory so the jsdom
 * environment — required for `@testing-library/react` — is
 * applied. The component under test is in
 * `src/features/quizzes/components/QuizRelatedQuizzes.tsx`
 * (TKT-3.8.B2).
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'

import { ApiError } from '@/lib/api'
import type { QuizListItemDto } from '@/lib/api/generated/schemas'

import { QuizRelatedQuizzes } from '@/features/quizzes/components/QuizRelatedQuizzes'

// ---------------------------------------------------------------------------
// Hook mock — the only place the live component reaches the wrapper
// (cross-story contract rule #1 from `PHASE_3_EPICS.md` line 60).
// ---------------------------------------------------------------------------

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

// ──────────────────────────────────────────────────────────────────────
// (a) Loading
// ──────────────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────────────
// (b) Empty array
// ──────────────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────────────
// (c) 404 (notFound)
// ──────────────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────────────
// (d) 5xx (typed error)
// ──────────────────────────────────────────────────────────────────────

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
    // Story 3.8 lines 884–885: no skeleton, no toast, no inline
    // error surface.
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

// ──────────────────────────────────────────────────────────────────────
// (e) Happy path
// ──────────────────────────────────────────────────────────────────────

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

    // Heading parity — same id as the skeleton.
    const heading = screen.getByRole('heading', {
      level: 2,
      name: 'Related quizzes',
    })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveAttribute('id', 'quiz-related-heading')

    // Four QuizCards rendered.
    const section = screen.getByTestId('quiz-related-quizzes')
    const cards = within(section).getAllByTestId('quiz-card')
    expect(cards).toHaveLength(4)

    // Order preserved — the cards follow the array order.
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
    // QUIZ_RELATED_LIMIT = 4 — defensive cap so a backend that
    // returns more than the baseline cannot blow up the grid.
    expect(within(section).getAllByTestId('quiz-card')).toHaveLength(4)
  })
})
