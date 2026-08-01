/**
 * `useTagQuizzes` — unit spec.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.B8.
 *
 * Four cases (per B8 AC #1):
 *
 *   (a) single-page: wrapper returns one page's items → hook exposes
 *       `{ items: [...], hasMore: false, error: null }`.
 *   (b) two-page: wrapper returns a first page with `hasNextPage: true`
 *       and a second page with `hasNextPage: false` → after `loadMore`,
 *       `{ items: [...first + second], hasMore: false }`.
 *   (c) 404 path: wrapper throws `ApiError(404)` → hook returns
 *       `{ items: [], hasMore: false, error: null }` (the
 *       "404-→-empty" contract from Story 3.4 line 458).
 *   (d) 5xx path: wrapper throws `ApiError(500)` → hook returns
 *       `{ items: [], error: <ApiError> }` (retryable).
 *
 * Test-environment note (B8 AC #1):
 *
 *   - The file lives under `src/components/primitives/__tests__/` so
 *     vitest's `jsdom` project picks it up. The Epic 3.2
 *     `useCursorPaginated.spec.tsx` is the precedent.
 *
 * Drift note (TKT-3.4.A1 §2): the SDK's `tagControllerGetTagQuizzes`
 * does NOT accept a `params` argument; the wrapper (`getTagQuizzes`)
 * extends the underlying call to `orvalCustomInstance` to plumb the
 * cursor + limit down to the wire. The mock below mirrors the
 * post-unwrap envelope shape (`{ data, meta }`) the wrapper returns.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, act } from '@testing-library/react'
import { SWRConfig } from 'swr'

import { ApiError } from '@/lib/api'
import type { QuizListItemDto } from '@/lib/api/generated/schemas'

import { useTagQuizzes } from '@/features/tags/hooks/useTagQuizzes'

// ---------------------------------------------------------------------------
// Mocks — module-level mocks for the SDK wrappers (TKT-3.4.A2)
// ---------------------------------------------------------------------------

const getTagQuizzesMock = vi.fn()

vi.mock('@/features/tags/wrappers/tag.wrapper', () => ({
  listTags: vi.fn(),
  getTagBySlug: vi.fn(),
  getTag: vi.fn(),
  getTagsPopular: vi.fn(),
  getTagsTrending: vi.fn(),
  getTagQuizzes: (...args: unknown[]) => getTagQuizzesMock(...args),
  getRelatedTags: vi.fn(),
  getTagAnalytics: vi.fn(),
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
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
    categoryId: null,
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
    useTagQuizzes('javascript', { limit: 10 })
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
  getTagQuizzesMock.mockReset()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTagQuizzes — single-page', () => {
  it('returns the page items with hasMore=false and error=null', async () => {
    const items = [
      makeQuiz({ quizId: '0192f4d8-0000-7000-8000-000000000001', title: 'Q1' }),
      makeQuiz({ quizId: '0192f4d8-0000-7000-8000-000000000002', title: 'Q2' }),
    ]
    getTagQuizzesMock.mockResolvedValueOnce({
      data: items,
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
      expect(snap.hasMore).toBe(false)
      expect(snap.errorStatus).toBeNull()
      expect(snap.isLoading).toBe(false)
    })

    expect(getTagQuizzesMock).toHaveBeenCalledWith('javascript', {
      cursor: undefined,
      limit: 10,
    })
  })
})

describe('useTagQuizzes — two-page', () => {
  it('after loadMore, items merge and hasMore=false on the second page', async () => {
    const firstPage = [
      makeQuiz({ quizId: '0192f4d8-0000-7000-8000-000000000001', title: 'Q1' }),
      makeQuiz({ quizId: '0192f4d8-0000-7000-8000-000000000002', title: 'Q2' }),
    ]
    const secondPage = [
      makeQuiz({ quizId: '0192f4d8-0000-7000-8000-000000000003', title: 'Q3' }),
    ]

    getTagQuizzesMock
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
    expect(getTagQuizzesMock).toHaveBeenCalledTimes(2)
    expect(getTagQuizzesMock).toHaveBeenNthCalledWith(1, 'javascript', {
      cursor: undefined,
      limit: 10,
    })
    expect(getTagQuizzesMock).toHaveBeenNthCalledWith(2, 'javascript', {
      cursor: 'cursor-2',
      limit: 10,
    })
  })
})

describe('useTagQuizzes — 404 path', () => {
  it('returns an empty list with hasMore=false and error=null (404 → empty contract)', async () => {
    getTagQuizzesMock.mockRejectedValueOnce(
      makeApiError(404, 'TAG_QUIZZES_NOT_FOUND'),
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

describe('useTagQuizzes — 5xx path', () => {
  it('returns an empty list with error.status=500 (retryable)', async () => {
    getTagQuizzesMock.mockRejectedValueOnce(makeApiError(500))

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
