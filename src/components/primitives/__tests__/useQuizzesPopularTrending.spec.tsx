/**
 * `useQuizzesPopular` and `useQuizzesTrending` — unit specs.
 *
 * Source epic: Epic 3.5 — Global quizzes list + filters.
 * Source ticket: TKT-3.5.B5.
 *
 * Three cases per hook (per B5 AC #1):
 *
 *   (a) happy path: wrapper returns a 3-item array → hook returns
 *       `{ quizzes: [...3 items], isLoading: false, error: null }`.
 *   (b) error path: wrapper throws an `ApiError(500)` → hook returns
 *       `{ quizzes: [], isLoading: false, error: <ApiError> }`.
 *   (c) SWR-key stability: two consecutive calls with the same `params`
 *       produce the same SWR key (single fetcher call).
 *
 * Test-environment note (B5 AC #1):
 *   - The file lives under `src/components/primitives/__tests__/` so
 *     vitest's `jsdom` project picks it up (Epic 3.2 / 3.3 / 3.4
 *     precedent).
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'

import { ApiError } from '@/lib/api'
import type {
  PopularQuizItemDto,
  TrendingQuizItemDto,
} from '@/lib/api/generated/schemas'

import { useQuizzesPopular } from '@/features/quizzes/hooks/useQuizzesPopular'
import { useQuizzesTrending } from '@/features/quizzes/hooks/useQuizzesTrending'

// ---------------------------------------------------------------------------
// Mocks — module-level mocks for the SDK wrappers (TKT-3.5.A2)
// ---------------------------------------------------------------------------

const getQuizzesPopularMock = vi.fn()
const getQuizzesTrendingMock = vi.fn()

vi.mock('@/features/quizzes/api/quizzes.wrapper', () => ({
  listQuizzes: vi.fn(),
  getQuizBySlug: vi.fn(),
  getQuizzesPopular: (...args: unknown[]) => getQuizzesPopularMock(...args),
  getQuizzesTrending: (...args: unknown[]) => getQuizzesTrendingMock(...args),
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

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

function makePopularQuiz(
  overrides: Partial<PopularQuizItemDto> = {},
): PopularQuizItemDto {
  return {
    rank: 1,
    quizId: '0192f4d8-0000-7000-8000-000000000001',
    creatorId: null,
    title: 'Popular Quiz',
    slug: 'popular-quiz',
    imageUrl: null,
    popularityScore: 9.5,
    totalAttempts: 1000,
    averageRating: 4.5,
    bookmarkCount: 50,
    ...overrides,
  }
}

function makeTrendingQuiz(
  overrides: Partial<TrendingQuizItemDto> = {},
): TrendingQuizItemDto {
  return {
    rank: 1,
    quizId: '0192f4d8-0000-7000-8000-000000000001',
    creatorId: null,
    title: 'Trending Quiz',
    slug: 'trending-quiz',
    imageUrl: null,
    trendingScore: 8.5,
    totalAttempts: 500,
    recentAttempts: 100,
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
// Probe components
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

function makeProbe<T>(useHook: () => T) {
  return function Probe() {
    const value = useHook()
    const v = value as {
      quizzes?: unknown[]
      error?: ApiError | null
      isLoading?: boolean
    }
    const snapshot = {
      quizzesLength: v.quizzes ? v.quizzes.length : null,
      errorStatus: v.error ? v.error.status : null,
      isLoading: v.isLoading ?? false,
    }
    return <div data-testid='probe' data-value={JSON.stringify(snapshot)} />
  }
}

function readProbe(): {
  quizzesLength: number | null
  errorStatus: number | null
  isLoading: boolean
} {
  const el = screen.getByTestId('probe')
  return JSON.parse(el.getAttribute('data-value') ?? '{}')
}

afterEach(() => {
  cleanup()
  getQuizzesPopularMock.mockReset()
  getQuizzesTrendingMock.mockReset()
})

// ---------------------------------------------------------------------------
// useQuizzesPopular
// ---------------------------------------------------------------------------

describe('useQuizzesPopular — happy path', () => {
  it('returns the wrapper-resolved list with isLoading=false and error=null', async () => {
    const list: PopularQuizItemDto[] = [
      makePopularQuiz({ rank: 1, title: 'Popular 1', slug: 'popular-1' }),
      makePopularQuiz({
        rank: 2,
        title: 'Popular 2',
        slug: 'popular-2',
        quizId: '0192f4d8-0000-7000-8000-000000000002',
      }),
      makePopularQuiz({
        rank: 3,
        title: 'Popular 3',
        slug: 'popular-3',
        quizId: '0192f4d8-0000-7000-8000-000000000003',
      }),
    ]
    getQuizzesPopularMock.mockResolvedValue({ data: list })

    const Probe = makeProbe(() => useQuizzesPopular({ limit: 10 }))

    render(
      <TestSwrProvider>
        <Probe />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.quizzesLength).toBe(3)
      expect(snap.errorStatus).toBeNull()
      expect(snap.isLoading).toBe(false)
    })

    expect(getQuizzesPopularMock).toHaveBeenCalledWith({ limit: 10 })
  })
})

describe('useQuizzesPopular — error path', () => {
  it('returns an empty list with error.status=500 when the wrapper throws', async () => {
    getQuizzesPopularMock.mockRejectedValue(makeApiError(500))

    const Probe = makeProbe(() => useQuizzesPopular({ limit: 10 }))

    render(
      <TestSwrProvider>
        <Probe />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.errorStatus).toBe(500)
      expect(snap.quizzesLength).toBe(0)
      expect(snap.isLoading).toBe(false)
    })
  })
})

describe('useQuizzesPopular — SWR-key stability', () => {
  it('two calls with the same params produce the same SWR key (single fetcher call)', async () => {
    getQuizzesPopularMock.mockResolvedValue({
      data: [makePopularQuiz({ rank: 1 })],
    })

    function DoubleProbe() {
      const a = useQuizzesPopular({ limit: 10 })
      const b = useQuizzesPopular({ limit: 10 })
      return (
        <div
          data-testid='probe'
          data-a={a.quizzes.length}
          data-b={b.quizzes.length}
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

    expect(getQuizzesPopularMock).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// useQuizzesTrending
// ---------------------------------------------------------------------------

describe('useQuizzesTrending — happy path', () => {
  it('returns the wrapper-resolved list with isLoading=false and error=null', async () => {
    const list: TrendingQuizItemDto[] = [
      makeTrendingQuiz({ rank: 1, title: 'Trending 1', slug: 'trending-1' }),
      makeTrendingQuiz({
        rank: 2,
        title: 'Trending 2',
        slug: 'trending-2',
        quizId: '0192f4d8-0000-7000-8000-000000000002',
      }),
    ]
    getQuizzesTrendingMock.mockResolvedValue({ data: list })

    const Probe = makeProbe(() => useQuizzesTrending({ limit: 10 }))

    render(
      <TestSwrProvider>
        <Probe />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.quizzesLength).toBe(2)
      expect(snap.errorStatus).toBeNull()
      expect(snap.isLoading).toBe(false)
    })

    expect(getQuizzesTrendingMock).toHaveBeenCalledWith({ limit: 10 })
  })
})

describe('useQuizzesTrending — error path', () => {
  it('returns an empty list with error.status=500 when the wrapper throws', async () => {
    getQuizzesTrendingMock.mockRejectedValue(makeApiError(500))

    const Probe = makeProbe(() => useQuizzesTrending({ limit: 10 }))

    render(
      <TestSwrProvider>
        <Probe />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.errorStatus).toBe(500)
      expect(snap.quizzesLength).toBe(0)
      expect(snap.isLoading).toBe(false)
    })
  })
})

describe('useQuizzesTrending — SWR-key stability', () => {
  it('two calls with the same params produce the same SWR key (single fetcher call)', async () => {
    getQuizzesTrendingMock.mockResolvedValue({
      data: [makeTrendingQuiz({ rank: 1 })],
    })

    function DoubleProbe() {
      const a = useQuizzesTrending({ limit: 10 })
      const b = useQuizzesTrending({ limit: 10 })
      return (
        <div
          data-testid='probe'
          data-a={a.quizzes.length}
          data-b={b.quizzes.length}
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

    expect(getQuizzesTrendingMock).toHaveBeenCalledTimes(1)
  })
})