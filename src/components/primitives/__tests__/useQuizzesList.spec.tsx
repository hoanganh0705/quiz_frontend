/**
 * `useQuizzesList` — unit spec.
 *
 * Source epic: Epic 3.5 — Global quizzes list + filters.
 * Source ticket: TKT-3.5.B4.
 *
 * Five cases (per B4 AC #1):
 *
 *   (a) happy path: wrapper returns a 1-page result → hook exposes
 *       `{ items: [...], hasMore: false, error: null }`.
 *   (b) load-more: wrapper returns `hasNextPage: true` on page 1,
 *       `hasNextPage: false` on page 2 → after `loadMore`,
 *       `{ items: [...first + second], hasMore: false }`.
 *   (c) 422 → coerce: wrapper throws `ApiError(422)` on the first
 *       call (because of stale tag ids) → hook retries with empty
 *       `tagIds` and returns the unfiltered page.
 *   (d) 404 → empty: wrapper throws `ApiError(404)` → hook returns
 *       `{ items: [], hasMore: false, error: null }` (the
 *       "404-→-empty" contract from Story 3.5 line 580).
 *   (e) filter-resets-cursor: changing the `filters` object in the
 *       query refetches page 1 with the new params (the SWR key
 *       changes, so the cache is cleared).
 *   (f) SWR-key stability: two consecutive calls with the same
 *       `filters`/`limit` produce the same SWR key (single fetcher
 *       call).
 *   (g) slug → UUIDv7 resolution: `tagSlugs` are resolved to `tagIds`
 *       via the `listTags` wrapper; unknown slugs are silently dropped.
 *
 * Test-environment note (B4 AC #1):
 *   - The file lives under `src/components/primitives/__tests__/` so
 *     vitest's `jsdom` project picks it up (Epic 3.2 / 3.3 / 3.4
 *     precedent).
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, act } from '@testing-library/react'
import { SWRConfig } from 'swr'

import { ApiError } from '@/lib/api'
import type { QuizListItemDto, TagResponseDto } from '@/lib/api/generated/schemas'

import { useQuizzesList } from '@/features/quizzes/hooks/useQuizzesList'

// ---------------------------------------------------------------------------
// Mocks — module-level mocks for the SDK wrappers (TKT-3.5.A2)
// ---------------------------------------------------------------------------

const listQuizzesMock = vi.fn()
const listTagsMock = vi.fn()

vi.mock('@/features/quizzes/api/quizzes.wrapper', () => ({
  listQuizzes: (...args: unknown[]) => listQuizzesMock(...args),
  getQuizBySlug: vi.fn(),
  getQuizzesPopular: vi.fn(),
  getQuizzesTrending: vi.fn(),
  createQuiz: vi.fn(),
  updateQuiz: vi.fn(),
  deleteQuiz: vi.fn(),
  createQuizVersion: vi.fn(),
  listQuizVersions: vi.fn(),
  updateQuizVersion: vi.fn(),
  publishQuizVersion: vi.fn(),
  addQuestion: vi.fn(),
  addQuestionsBulk: vi.fn(),
}))

vi.mock('@/features/tags/wrappers/tag.wrapper', () => ({
  listTags: (...args: unknown[]) => listTagsMock(...args),
  getTagBySlug: vi.fn(),
  getTag: vi.fn(),
  getTagsPopular: vi.fn(),
  getTagsTrending: vi.fn(),
  getTagQuizzes: vi.fn(),
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

function makeTag(
  overrides: Partial<TagResponseDto> = {},
): TagResponseDto {
  return {
    tagId: 'tag-id-1',
    name: 'Tag One',
    slug: 'tag-one',
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

/**
 * Mirrors the post-unwrap envelope shape that `listQuizzes` returns.
 */
function makeListResponse(
  items: QuizListItemDto[],
  paginationOverride: Partial<{
    nextCursor: string | null
    hasNextPage: boolean
    limit: number
  }> = {},
) {
  return {
    data: items,
    meta: {
      pagination: {
        kind: 'cursor' as const,
        limit: paginationOverride.limit ?? items.length,
        nextCursor: paginationOverride.nextCursor ?? null,
        hasNextPage: paginationOverride.hasNextPage ?? false,
      },
    },
  }
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

/**
 * Probe component that exposes the hook's snapshot via data
 * attributes and exposes a `loadMore` button for the load-more test.
 */
function ProbeWithLoadMore({
  query,
}: {
  query: Parameters<typeof useQuizzesList>[0]
}) {
  const { items, hasMore, isLoading, error, loadMore } = useQuizzesList(query)
  return (
    <div>
      <div
        data-testid='probe'
        data-items-length={items.length}
        data-has-more={hasMore ? 'true' : 'false'}
        data-is-loading={isLoading ? 'true' : 'false'}
        data-error-status={error ? error.status : 'null'}
      />
      <button data-testid='loadmore' onClick={loadMore}>
        Load more
      </button>
    </div>
  )
}

/**
 * Probe without a `loadMore` button — for tests that don't need it.
 */
function Probe({
  query,
}: {
  query: Parameters<typeof useQuizzesList>[0]
}) {
  const { items, hasMore, isLoading, error } = useQuizzesList(query)
  return (
    <div
      data-testid='probe'
      data-items-length={items.length}
      data-has-more={hasMore ? 'true' : 'false'}
      data-is-loading={isLoading ? 'true' : 'false'}
      data-error-status={error ? error.status : 'null'}
    />
  )
}

/**
 * Probe that exposes the hook's `coercedFilters` field via a data
 * attribute (TKT-3.5.F3). The coerced state is JSON-encoded into
 * `data-coerced`; the test asserts the encoded JSON to avoid
 * `react-hooks/globals` lint violations (closure variables are
 * read-only across renders).
 */
function ProbeWithCoerced({
  query,
}: {
  query: Parameters<typeof useQuizzesList>[0]
}) {
  const { items, isLoading, error, coercedFilters } = useQuizzesList(query)
  return (
    <div
      data-testid='probe'
      data-items-length={items.length}
      data-is-loading={isLoading ? 'true' : 'false'}
      data-error-status={error ? error.status : 'null'}
      data-has-coerced={coercedFilters !== null ? 'true' : 'false'}
      data-coerced={coercedFilters === null ? 'null' : JSON.stringify(coercedFilters)}
    />
  )
}

function readProbe() {
  const el = screen.getByTestId('probe')
  return {
    itemsLength: Number(el.getAttribute('data-items-length')),
    hasMore: el.getAttribute('data-has-more') === 'true',
    isLoading: el.getAttribute('data-is-loading') === 'true',
    errorStatus: el.getAttribute('data-error-status'),
  }
}

afterEach(() => {
  cleanup()
  listQuizzesMock.mockReset()
  listTagsMock.mockReset()
})

// ---------------------------------------------------------------------------
// (a) happy path
// ---------------------------------------------------------------------------

describe('useQuizzesList — happy path', () => {
  it('returns the wrapper-resolved list with hasMore=false and error=null', async () => {
    listTagsMock.mockResolvedValue({ data: [] })
    const items = [
      makeQuiz({ quizId: '0192f4d8-0000-7000-8000-000000000001', title: 'Q1' }),
      makeQuiz({ quizId: '0192f4d8-0000-7000-8000-000000000002', title: 'Q2' }),
    ]
    listQuizzesMock.mockResolvedValueOnce(makeListResponse(items))

    render(
      <TestSwrProvider>
        <Probe query={{ filters: {} }} />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.itemsLength).toBe(2)
      expect(snap.hasMore).toBe(false)
      expect(snap.isLoading).toBe(false)
      expect(snap.errorStatus).toBe('null')
    })
  })
})

// ---------------------------------------------------------------------------
// (b) load-more
// ---------------------------------------------------------------------------

describe('useQuizzesList — load-more', () => {
  it('appends the second page after loadMore', async () => {
    listTagsMock.mockResolvedValue({ data: [] })
    const page1 = [
      makeQuiz({ quizId: '0192f4d8-0000-7000-8000-000000000001', title: 'Q1' }),
    ]
    const page2 = [
      makeQuiz({ quizId: '0192f4d8-0000-7000-8000-000000000002', title: 'Q2' }),
    ]
    listQuizzesMock
      .mockResolvedValueOnce(
        makeListResponse(page1, { nextCursor: 'cursor-2', hasNextPage: true, limit: 1 }),
      )
      .mockResolvedValueOnce(
        makeListResponse(page2, { nextCursor: null, hasNextPage: false, limit: 1 }),
      )

    render(
      <TestSwrProvider>
        <ProbeWithLoadMore query={{ filters: {} }} />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      expect(readProbe().itemsLength).toBe(1)
    })

    await act(async () => {
      screen.getByTestId('loadmore').click()
    })

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.itemsLength).toBe(2)
      expect(snap.hasMore).toBe(false)
    })

    expect(listQuizzesMock).toHaveBeenCalledTimes(2)
    // The second call must include the cursor from the first page.
    expect(listQuizzesMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ cursor: 'cursor-2' }),
    )
  })
})

// ---------------------------------------------------------------------------
// (c) 422 → coerce
// ---------------------------------------------------------------------------

describe('useQuizzesList — 422 → coerce', () => {
  it('retries with empty tagIds when the wrapper throws 422', async () => {
    listTagsMock.mockResolvedValue({ data: [] })
    const items = [makeQuiz({ title: 'Q1' })]
    listQuizzesMock
      .mockRejectedValueOnce(makeApiError(422, 'INVALID_TAG_ID'))
      .mockResolvedValueOnce(makeListResponse(items))

    render(
      <TestSwrProvider>
        <Probe query={{ filters: { tagSlugs: ['does-not-exist'] } }} />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.itemsLength).toBe(1)
      expect(snap.errorStatus).toBe('null')
    })

    expect(listQuizzesMock).toHaveBeenCalledTimes(2)
    // The second call must have been made with `tagIds: undefined`
    // (the coerce strategy).
    const secondCallArgs = listQuizzesMock.mock.calls[1][0]
    expect(secondCallArgs.tagIds).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// (c2) 422 → coerce surfaces coercedFilters (TKT-3.5.F3)
// ---------------------------------------------------------------------------

describe('useQuizzesList — 422 → coerce surfaces coercedFilters', () => {
  it('after coercion, the hook returns the filter state with the offending field absent', async () => {
    listTagsMock.mockResolvedValue({ data: [] })
    listQuizzesMock
      .mockRejectedValueOnce(makeApiError(422, 'INVALID_TAG_ID'))
      .mockResolvedValueOnce(makeListResponse([makeQuiz({ title: 'Q1' })]))

    render(
      <TestSwrProvider>
        <ProbeWithCoerced
          query={{
            filters: { tagSlugs: ['does-not-exist'], difficulty: 'easy' }
          }}
        />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const el = screen.getByTestId('probe')
      expect(el.getAttribute('data-items-length')).toBe('1')
      expect(el.getAttribute('data-has-coerced')).toBe('true')
      expect(el.getAttribute('data-error-status')).toBe('null')
    })

    // The coerced filter state is exposed — with the offending
    // `tagSlugs` field absent. The remaining fields (e.g. `difficulty`)
    // are preserved verbatim.
    const probeEl = screen.getByTestId('probe')
    const coercedJson = probeEl.getAttribute('data-coerced') ?? '{}'
    const coerced = JSON.parse(coercedJson) as Record<string, unknown>
    expect(coerced.tagSlugs).toBeUndefined()
    expect(coerced.difficulty).toBe('easy')
  })

  it('coercedFilters is null when no coercion has fired', async () => {
    listTagsMock.mockResolvedValue({ data: [] })
    listQuizzesMock.mockResolvedValue(
      makeListResponse([makeQuiz({ title: 'Q1' })])
    )

    render(
      <TestSwrProvider>
        <ProbeWithCoerced query={{ filters: { difficulty: 'easy' } }} />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const el = screen.getByTestId('probe')
      expect(el.getAttribute('data-items-length')).toBe('1')
      // `data-coerced` is the string 'null' (JSON-encoded).
      expect(el.getAttribute('data-coerced')).toBe('null')
    })
  })
})

// ---------------------------------------------------------------------------
// (d) 404 → empty
// ---------------------------------------------------------------------------

describe('useQuizzesList — 404 → empty', () => {
  it('returns an empty list with error=null when the wrapper throws 404', async () => {
    listTagsMock.mockResolvedValue({ data: [] })
    listQuizzesMock.mockRejectedValueOnce(makeApiError(404))

    render(
      <TestSwrProvider>
        <Probe query={{ filters: {} }} />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.itemsLength).toBe(0)
      expect(snap.hasMore).toBe(false)
      expect(snap.errorStatus).toBe('null')
    })
  })
})

// ---------------------------------------------------------------------------
// (e) filter-resets-cursor
// ---------------------------------------------------------------------------

describe('useQuizzesList — filter-resets-cursor', () => {
  it('changing filters triggers a fresh fetch (new SWR key)', async () => {
    listTagsMock.mockResolvedValue({ data: [] })
    const items = [makeQuiz({ title: 'Q1' })]
    listQuizzesMock.mockResolvedValue(makeListResponse(items))

    const { rerender } = render(
      <TestSwrProvider>
        <Probe query={{ filters: { difficulty: 'easy' } }} />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      expect(listQuizzesMock).toHaveBeenCalledTimes(1)
    })

    // Rerender with a different filter — should refetch.
    rerender(
      <TestSwrProvider>
        <Probe query={{ filters: { difficulty: 'hard' } }} />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      expect(listQuizzesMock).toHaveBeenCalledTimes(2)
    })

    // The second call must reflect the new filter.
    const secondCallArgs = listQuizzesMock.mock.calls[1][0]
    expect(secondCallArgs.difficulty).toBe('hard')
  })
})

// ---------------------------------------------------------------------------
// (f) SWR-key stability
// ---------------------------------------------------------------------------

describe('useQuizzesList — SWR-key stability', () => {
  it('two calls with the same filters produce a single fetcher call', async () => {
    listTagsMock.mockResolvedValue({ data: [] })
    const items = [makeQuiz({ title: 'Q1' })]
    listQuizzesMock.mockResolvedValue(makeListResponse(items))

    function DoubleProbe() {
      const a = useQuizzesList({ filters: { difficulty: 'easy' } })
      const b = useQuizzesList({ filters: { difficulty: 'easy' } })
      return (
        <div
          data-testid='probe'
          data-a={a.items.length}
          data-b={b.items.length}
        />
      )
    }

    render(
      <TestSwrProvider>
        <DoubleProbe />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const el = screen.getByTestId('probe')
      expect(el.getAttribute('data-a')).toBe('1')
      expect(el.getAttribute('data-b')).toBe('1')
    })

    expect(listQuizzesMock).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// (g) slug → UUIDv7 resolution
// ---------------------------------------------------------------------------

describe('useQuizzesList — slug → UUIDv7 resolution', () => {
  it('resolves tagSlugs to tagIds via the listTags wrapper', async () => {
    const tag1 = makeTag({
      tagId: 'tag-id-1',
      slug: 'science',
      name: 'Science',
    })
    const tag2 = makeTag({
      tagId: 'tag-id-2',
      slug: 'math',
      name: 'Math',
    })
    listTagsMock.mockResolvedValue({ data: [tag1, tag2] })
    listQuizzesMock.mockResolvedValue(makeListResponse([makeQuiz({})]))

    render(
      <TestSwrProvider>
        <Probe query={{ filters: { tagSlugs: ['science', 'math'] } }} />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      expect(listQuizzesMock).toHaveBeenCalledTimes(1)
    })

    const callArgs = listQuizzesMock.mock.calls[0][0]
    expect(callArgs.tagIds).toEqual(['tag-id-1', 'tag-id-2'])
  })

  it('silently drops unknown tag slugs', async () => {
    const tag1 = makeTag({ tagId: 'tag-id-1', slug: 'science', name: 'Science' })
    listTagsMock.mockResolvedValue({ data: [tag1] })
    listQuizzesMock.mockResolvedValue(makeListResponse([makeQuiz({})]))

    render(
      <TestSwrProvider>
        <Probe
          query={{ filters: { tagSlugs: ['science', 'does-not-exist'] } }}
        />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      expect(listQuizzesMock).toHaveBeenCalledTimes(1)
    })

    const callArgs = listQuizzesMock.mock.calls[0][0]
    expect(callArgs.tagIds).toEqual(['tag-id-1'])
  })
})

// ---------------------------------------------------------------------------
// (h) soft-deleted quiz filter (TKT-3.5.F2)
// ---------------------------------------------------------------------------

describe('useQuizzesList — soft-deleted (isHidden) quiz filter', () => {
  it('excludes `isHidden: true` items from `result.items`', async () => {
    listTagsMock.mockResolvedValue({ data: [] })
    const visibleQuiz = makeQuiz({
      quizId: '0192f4d8-0000-7000-8000-000000000001',
      title: 'Visible Quiz',
      isHidden: false,
    })
    const hiddenQuiz = makeQuiz({
      quizId: '0192f4d8-0000-7000-8000-000000000002',
      title: 'Hidden Quiz',
      isHidden: true,
    })
    listQuizzesMock.mockResolvedValueOnce(
      makeListResponse([visibleQuiz, hiddenQuiz])
    )

    render(
      <TestSwrProvider>
        <Probe query={{ filters: {} }} />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      // The hidden item is excluded — only the visible item remains.
      expect(snap.itemsLength).toBe(1)
    })
  })

  it('returns the full list when no item is hidden', async () => {
    listTagsMock.mockResolvedValue({ data: [] })
    const items = [
      makeQuiz({
        quizId: '0192f4d8-0000-7000-8000-000000000001',
        title: 'Q1',
        isHidden: false,
      }),
      makeQuiz({
        quizId: '0192f4d8-0000-7000-8000-000000000002',
        title: 'Q2',
        isHidden: false,
      }),
    ]
    listQuizzesMock.mockResolvedValueOnce(makeListResponse(items))

    render(
      <TestSwrProvider>
        <Probe query={{ filters: {} }} />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      expect(readProbe().itemsLength).toBe(2)
    })
  })
})