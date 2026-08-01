/**
 * `useCategoryQuizzes` — unit spec.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source ticket: TKT-3.3.B7.
 *
 * Four cases (per B7 AC #1):
 *
 *   (a) single-page: wrapper returns one page's items → hook exposes
 *       `{ items: [...], hasMore: false, error: null }`.
 *   (b) two-page: wrapper returns a first page with `hasNextPage: true`
 *       and a second page with `hasNextPage: false` → after `loadMore`,
 *       `{ items: [...first + second], hasMore: false }`.
 *   (c) 404 path: wrapper throws `ApiError(404)` → hook returns
 *       `{ items: [], hasMore: false, error: null }` (the
 *       "404-→-empty" contract from Story 3.3 line 341).
 *   (d) 5xx path: wrapper throws `ApiError(500)` → hook returns
 *       `{ items: [], error: <ApiError> }` (retryable).
 *
 * This is the first Phase-3 feature-level hook that consumes the
 * cursor-pagination primitive end-to-end, so the test doubles as
 * a smoke test for the cursor primitive's inflight/race behaviour
 * from Epic 3.2.
 *
 * Test-environment note (B7 AC #1):
 *
 *   - The file lives under `src/components/primitives/__tests__/` so
 *     vitest's `jsdom` project picks it up. The Epic 3.2
 *     `useCursorPaginated.spec.tsx` is the precedent.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, act } from '@testing-library/react'
import { SWRConfig } from 'swr'

import { ApiError } from '@/lib/api'
import type { QuizListItemDto } from '@/lib/api/generated/schemas'

import { useCategoryQuizzes } from '@/features/categories/hooks/useCategoryQuizzes'

// ---------------------------------------------------------------------------
// Mocks — module-level mocks for the SDK wrappers (TKT-3.3.A2)
// ---------------------------------------------------------------------------

const getCategoryQuizzesMock = vi.fn()

vi.mock('@/features/categories/wrappers/category.wrapper', () => ({
  getCategoryQuizzes: (...args: unknown[]) =>
    getCategoryQuizzesMock(...args),
  listCategories: vi.fn(),
  getCategoryBySlug: vi.fn(),
  getCategory: vi.fn(),
  getCategoriesRanked: vi.fn(),
  getCategoriesTrending: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

function makeQuiz(
  overrides: Partial<QuizListItemDto> = {},
): QuizListItemDto {
  return {
    quizId: '0192f4d8-0000-7000-8000-000000000001',
    creatorId: null,
    title: 'Sample quiz',
    description: null,
    slug: 'sample-quiz',
    requirements: null,
    imageUrl: null,
    categoryId: '0192f4d8-0000-7000-8000-0000000000aa',
    isFeatured: false,
    isHidden: false,
    isVerified: true,
    publishedVersionId: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeApiError(status: number, code = 'INTERNAL'): ApiError {
  return new ApiError({
    config: undefined,
    request: undefined,
    response: {
      status,
      data: { code, detail: 'fixture' },
    },
    isAxiosError: true,
    name: 'AxiosError',
    message: `Mock ${status}`,
    code,
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0])
}

// ---------------------------------------------------------------------------
// Per-test SWR provider (fresh cache to dodge cross-test cache leaks)
// ---------------------------------------------------------------------------

function TestSwrProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        provider: () => new Map(),
        revalidateOnFocus: false,
        revalidateIfStale: false,
        dedupingInterval: 0,
        errorRetryCount: 0,
      }}
    >
      {children}
    </SWRConfig>
  )
}

// ---------------------------------------------------------------------------
// Probe component
// ---------------------------------------------------------------------------

function Probe() {
  const { items, isLoading, hasMore, error, loadMore } =
    useCategoryQuizzes('science', { limit: 10 })
  const snapshot = {
    itemsLength: items.length,
    firstTitle: items[0]?.title ?? null,
    isLoading,
    hasMore,
    errorStatus: error ? error.status : null,
  }
  return (
    <div data-testid='probe' data-value={JSON.stringify(snapshot)}>
      <button data-testid='loadmore' onClick={loadMore}>
        Load more
      </button>
    </div>
  )
}

function readProbe(): {
  itemsLength: number
  firstTitle: string | null
  isLoading: boolean
  hasMore: boolean
  errorStatus: number | null
} {
  const el = screen.getByTestId('probe')
  return JSON.parse(el.getAttribute('data-value') ?? '{}')
}

afterEach(() => {
  cleanup()
  getCategoryQuizzesMock.mockReset()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCategoryQuizzes — single-page', () => {
  it('returns the page items with hasMore=false and error=null', async () => {
    const items = [
      makeQuiz({ quizId: '0192f4d8-0000-7000-8000-000000000001', title: 'Q1' }),
      makeQuiz({ quizId: '0192f4d8-0000-7000-8000-000000000002', title: 'Q2' }),
    ]
    getCategoryQuizzesMock.mockResolvedValueOnce({
      data: items,
      meta: { pagination: { kind: 'cursor', limit: 10, nextCursor: null, hasNextPage: false } },
    })

    render(
      <TestSwrProvider>
        <Probe />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.itemsLength).toBe(2)
      expect(snap.hasMore).toBe(false)
      expect(snap.errorStatus).toBeNull()
      expect(snap.isLoading).toBe(false)
    })

    expect(getCategoryQuizzesMock).toHaveBeenCalledWith('science', {
      cursor: undefined,
      limit: 10,
    })
  })
})

describe('useCategoryQuizzes — two-page', () => {
  it('after loadMore, items merge and hasMore=false on the second page', async () => {
    const firstPage = [
      makeQuiz({ quizId: '0192f4d8-0000-7000-8000-000000000001', title: 'Q1' }),
      makeQuiz({ quizId: '0192f4d8-0000-7000-8000-000000000002', title: 'Q2' }),
    ]
    const secondPage = [
      makeQuiz({ quizId: '0192f4d8-0000-7000-8000-000000000003', title: 'Q3' }),
    ]

    getCategoryQuizzesMock
      .mockResolvedValueOnce({
        data: firstPage,
        meta: {
          pagination: {
            kind: 'cursor',
            limit: 10,
            nextCursor: 'cursor-2',
            hasNextPage: true,
          },
        },
      })
      .mockResolvedValueOnce({
        data: secondPage,
        meta: {
          pagination: {
            kind: 'cursor',
            limit: 10,
            nextCursor: null,
            hasNextPage: false,
          },
        },
      })

    render(
      <TestSwrProvider>
        <Probe />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.itemsLength).toBe(2)
      expect(snap.hasMore).toBe(true)
    })

    await act(async () => {
      screen.getByTestId('loadmore').click()
    })

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.itemsLength).toBe(3)
      expect(snap.hasMore).toBe(false)
      expect(snap.errorStatus).toBeNull()
    })

    // The fetch calls include the cursor on the second call.
    expect(getCategoryQuizzesMock).toHaveBeenCalledTimes(2)
    expect(getCategoryQuizzesMock).toHaveBeenNthCalledWith(1, 'science', {
      cursor: undefined,
      limit: 10,
    })
    expect(getCategoryQuizzesMock).toHaveBeenNthCalledWith(2, 'science', {
      cursor: 'cursor-2',
      limit: 10,
    })
  })
})

describe('useCategoryQuizzes — 404 path', () => {
  it('returns an empty list with hasMore=false and error=null (404 → empty contract)', async () => {
    getCategoryQuizzesMock.mockRejectedValueOnce(
      makeApiError(404, 'CATEGORY_QUIZZES_NOT_FOUND'),
    )

    render(
      <TestSwrProvider>
        <Probe />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.itemsLength).toBe(0)
      expect(snap.hasMore).toBe(false)
      expect(snap.errorStatus).toBeNull()
      expect(snap.isLoading).toBe(false)
    })
  })
})

describe('useCategoryQuizzes — 5xx path', () => {
  it('returns an empty list with error.status=500 (hasMore is true because hook has no data to determine otherwise)', async () => {
    getCategoryQuizzesMock.mockRejectedValueOnce(makeApiError(500))

    render(
      <TestSwrProvider>
        <Probe />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.itemsLength).toBe(0)
      expect(snap.errorStatus).toBe(500)
      expect(snap.isLoading).toBe(false)
    })
  })
})
