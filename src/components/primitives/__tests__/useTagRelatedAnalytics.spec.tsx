/**
 * `useTagRelated` and `useTagAnalytics` — unit specs.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.B6.
 *
 * Three cases for `useTagRelated` (per B6 AC #1):
 *
 *   (a) happy path: wrapper returns a 3-item array → hook returns
 *       `{ tags: [...3 items], isLoading: false, error: null }`.
 *   (b) error path: wrapper throws an `ApiError(500)` → hook returns
 *       `{ tags: [], isLoading: false, error: <ApiError> }`.
 *   (c) SWR-key stability: two consecutive calls with the same `params`
 *       produce the same SWR key (single fetcher call).
 *
 * Four cases for `useTagAnalytics` (per B6 AC #4):
 *
 *   (a) happy path: wrapper returns a `TagAnalyticsResponseDto` →
 *       hook returns `{ analytics: <dto>, isLoading: false, error: null }`.
 *   (b) 404 path: wrapper throws an `ApiError(404)` → hook returns
 *       `{ analytics: null, isLoading: false, error: null }` —
 *       the documented zero-state (Story 3.4 line 461).
 *   (c) 5xx path: wrapper throws an `ApiError(500)` → hook returns
 *       `{ analytics: null, isLoading: false, error: <ApiError> }`.
 *   (d) SWR-key stability: two consecutive calls with the same `id`
 *       produce the same SWR key.
 *
 * The tests mount the hooks inside a per-test `<SWRConfig>` wrapper so
 * the SWR + provider config end-to-end is exercised (no `useSWR` mock).
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'

import { ApiError } from '@/lib/api'
import type {
  TagAnalyticsResponseDto,
  TagResponseDto,
} from '@/lib/api/generated/schemas'

import { useTagRelated } from '@/features/tags/hooks/useTagRelated'
import { useTagAnalytics } from '@/features/tags/hooks/useTagAnalytics'

// ---------------------------------------------------------------------------
// Mocks — module-level mocks for the SDK wrappers (TKT-3.4.A2)
// ---------------------------------------------------------------------------

const getRelatedTagsMock = vi.fn()
const getTagAnalyticsMock = vi.fn()

vi.mock('@/features/tags/services/tags.service', () => ({
  listTags: vi.fn(),
  getTagBySlug: vi.fn(),
  getTag: vi.fn(),
  getTagsPopular: vi.fn(),
  getTagsTrending: vi.fn(),
  getTagQuizzes: vi.fn(),
  getRelatedTags: (...args: unknown[]) => getRelatedTagsMock(...args),
  getTagAnalytics: (...args: unknown[]) => getTagAnalyticsMock(...args),
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

function makeTag(overrides: Partial<TagResponseDto> = {}): TagResponseDto {
  return {
    tagId: '0192f4d8-0000-7000-8000-000000000001',
    name: 'javascript',
    slug: 'javascript',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeAnalytics(
  overrides: Partial<TagAnalyticsResponseDto> = {},
): TagAnalyticsResponseDto {
  return {
    tagId: '0192f4d8-0000-7000-8000-000000000001',
    tagName: 'javascript',
    summary: {
      totalQuizzes: 12,
      activeQuizzes: 10,
      totalAttempts: 500,
      uniquePlayers: 200,
      averageScore: 75.5,
      averageRating: 4.3,
    },
    topQuizzes: [],
    lastUpdated: '2026-07-01T00:00:00.000Z',
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

function makeProbe<T>(useHook: () => T) {
  return function Probe() {
    const value = useHook()
    const v = value as {
      tags?: unknown[]
      analytics?: unknown
      notFound?: boolean
      error?: ApiError | null
      isLoading?: boolean
    }
    const snapshot = {
      tagsLength: v.tags ? v.tags.length : null,
      hasAnalytics: v.analytics !== undefined && v.analytics !== null,
      analyticsIsNull: v.analytics === null,
      notFound: v.notFound ?? false,
      errorStatus: v.error ? v.error.status : null,
      isLoading: v.isLoading ?? false,
    }
    return <div data-testid='probe' data-value={JSON.stringify(snapshot)} />
  }
}

function readProbe(): {
  tagsLength: number | null
  hasAnalytics: boolean
  analyticsIsNull: boolean
  notFound: boolean
  errorStatus: number | null
  isLoading: boolean
} {
  const el = screen.getByTestId('probe')
  return JSON.parse(el.getAttribute('data-value') ?? '{}')
}

afterEach(() => {
  cleanup()
  getRelatedTagsMock.mockReset()
  getTagAnalyticsMock.mockReset()
})

// ---------------------------------------------------------------------------
// useTagRelated
// ---------------------------------------------------------------------------

describe('useTagRelated — happy path', () => {
  it('returns the wrapper-resolved list with isLoading=false and error=null', async () => {
    const list: TagResponseDto[] = [
      makeTag({ tagId: '0192f4d8-0000-7000-8000-000000000001', name: 'typescript', slug: 'typescript' }),
      makeTag({ tagId: '0192f4d8-0000-7000-8000-000000000002', name: 'react', slug: 'react' }),
      makeTag({ tagId: '0192f4d8-0000-7000-8000-000000000003', name: 'node-js', slug: 'node-js' }),
    ]
    getRelatedTagsMock.mockResolvedValue({ data: list })

    const Probe = makeProbe(() => useTagRelated('javascript', { limit: 10 }))

    render(
      <TestSwrProvider>
        <Probe />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.tagsLength).toBe(3)
      expect(snap.errorStatus).toBeNull()
      expect(snap.isLoading).toBe(false)
    })

    expect(getRelatedTagsMock).toHaveBeenCalledWith('javascript', { limit: 10 })
  })
})

describe('useTagRelated — error path', () => {
  it('returns an empty list with error.status=500 when the wrapper throws', async () => {
    getRelatedTagsMock.mockRejectedValue(makeApiError(500))

    const Probe = makeProbe(() => useTagRelated('javascript', { limit: 10 }))

    render(
      <TestSwrProvider>
        <Probe />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.errorStatus).toBe(500)
      expect(snap.tagsLength).toBe(0)
      expect(snap.isLoading).toBe(false)
    })
  })
})

describe('useTagRelated — SWR-key stability', () => {
  it('two calls with the same slug and params produce the same SWR key (single fetcher call)', async () => {
    getRelatedTagsMock.mockResolvedValue({
      data: [makeTag({ name: 'typescript', slug: 'typescript' })],
    })

    function DoubleProbe() {
      const a = useTagRelated('javascript', { limit: 10 })
      const b = useTagRelated('javascript', { limit: 10 })
      return (
        <div
          data-testid='probe'
          data-a={a.tags.length}
          data-b={b.tags.length}
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

    expect(getRelatedTagsMock).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// useTagAnalytics
// ---------------------------------------------------------------------------

describe('useTagAnalytics — happy path', () => {
  it('returns the wrapper-resolved analytics with isLoading=false, error=null, analyticsIsNull=false', async () => {
    const analytics = makeAnalytics({ tagName: 'javascript' })
    getTagAnalyticsMock.mockResolvedValue({ data: analytics })

    const Probe = makeProbe(() => useTagAnalytics('0192f4d8-0000-7000-8000-000000000001'))

    render(
      <TestSwrProvider>
        <Probe />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.hasAnalytics).toBe(true)
      expect(snap.analyticsIsNull).toBe(false)
      expect(snap.errorStatus).toBeNull()
      expect(snap.isLoading).toBe(false)
    })

    expect(getTagAnalyticsMock).toHaveBeenCalledWith('0192f4d8-0000-7000-8000-000000000001')
  })
})

describe('useTagAnalytics — 404 path (zero-state, story 3.4 line 461)', () => {
  it('returns analytics=null, error=null when the wrapper throws ApiError(404)', async () => {
    getTagAnalyticsMock.mockRejectedValueOnce(makeApiError(404, 'TAG_ANALYTICS_NOT_FOUND'))

    const Probe = makeProbe(() => useTagAnalytics('0192f4d8-0000-7000-8000-000000000001'))

    render(
      <TestSwrProvider>
        <Probe />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.analyticsIsNull).toBe(true)
      expect(snap.errorStatus).toBeNull()
      expect(snap.isLoading).toBe(false)
    })
  })
})

describe('useTagAnalytics — 5xx path', () => {
  it('returns analytics=null, error.status=500 when the wrapper throws ApiError(500)', async () => {
    getTagAnalyticsMock.mockRejectedValueOnce(makeApiError(500))

    const Probe = makeProbe(() => useTagAnalytics('0192f4d8-0000-7000-8000-000000000001'))

    render(
      <TestSwrProvider>
        <Probe />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.analyticsIsNull).toBe(true)
      expect(snap.errorStatus).toBe(500)
      expect(snap.isLoading).toBe(false)
    })
  })
})

describe('useTagAnalytics — SWR-key stability', () => {
  it('two calls with the same id produce the same SWR key (single fetcher call)', async () => {
    getTagAnalyticsMock.mockResolvedValue({
      data: makeAnalytics({ tagName: 'javascript' }),
    })

    function DoubleProbe() {
      const a = useTagAnalytics('0192f4d8-0000-7000-8000-000000000001')
      const b = useTagAnalytics('0192f4d8-0000-7000-8000-000000000001')
      return (
        <div
          data-testid='probe'
          data-a={a.analytics === null ? 'null' : 'set'}
          data-b={b.analytics === null ? 'null' : 'set'}
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
      expect(el.getAttribute('data-a')).toBe('set')
      expect(el.getAttribute('data-b')).toBe('set')
    })

    expect(getTagAnalyticsMock).toHaveBeenCalledTimes(1)
  })
})
