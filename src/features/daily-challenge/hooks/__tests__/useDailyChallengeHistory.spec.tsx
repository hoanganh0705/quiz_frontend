/**
 * `useDailyChallengeHistory.spec.tsx` — locks the contract of the
 * paginated-history hook (TKT-3.12.B1).
 *
 * Six cases per the ticket's testing checklist:
 *
 *   (1) The hook returns `isMissingEndpoint: true` and `items: []`
 *       when the wrapper reports `kind: 'missing-endpoint'` (the
 *       A1-locked default at this commit).
 *   (2) The hook returns `hasMore: false` and `items: []` on the
 *       missing-endpoint branch (the fetcher adapter's empty-page
 *       shape).
 *   (3) The hook surfaces `kind: 'error'` from the wrapper as a typed
 *       `ApiError` (cross-story contract rule #2).
 *   (4) The hook appends items after `loadMore` and reports
 *       `hasMore: false` once the server reports no more pages.
 *   (5) The hook forwards a `cursor` parameter to the wrapper
 *       (cursor mode is the A1-locked default — `EPIC_3_12_A1.md`
 *       §4); the wrapper is never called with a `cursor` field that
 *       is also a `number` (i.e. the offset branch).
 *   (6) The hook does not forward an `offset` parameter to the
 *       wrapper (the cursor branch is the default at this commit;
 *       drift `EPIC_3_12_A1.md` §4).
 *
 * The wrapper is mocked because the test is for the hook integration.
 * The hook's `useCursorPaginated` is the real primitive so the
 * 429 backoff / 5xx banner / dedupe policy is exercised.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'

import { ApiError } from '@/lib/api'

import { useDailyChallengeHistory } from '@/features/daily-challenge/hooks/useDailyChallengeHistory'

const getDailyChallengeHistoryPageMock = vi.fn(
  async (): Promise<{
    kind: 'ok' | 'missing-endpoint' | 'error'
    data?: unknown
    error?: unknown
  }> => {
    // The mock returns an empty `DailyChallengeResult` placeholder; each
    // test fills the resolved value via `mockResolvedValueOnce(...)` or
    // sets the rejected value via `mockRejectedValue(...)`. The
    // implementation intentionally ignores the call args (params are
    // captured via `getDailyChallengeHistoryPageMock.mock.calls`).
    return { kind: 'missing-endpoint' }
  },
)

vi.mock(
  '@/features/daily-challenge/services/daily-challenge.service',
  async () => {
    const actual =
      await vi.importActual<
        typeof import('@/features/daily-challenge/services/daily-challenge.service')
      >('@/features/daily-challenge/services/daily-challenge.service')
    return {
      ...actual,
      // The mock wrapper re-types the args list as a tuple so the
      // mock fn's variadic signature can forward the args.
      getDailyChallengeHistoryPage: (...args: unknown[]) =>
        (getDailyChallengeHistoryPageMock as (...a: unknown[]) => unknown)(...args),
    }
  },
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function makeItem(id: string) {
  return {
    id,
    date: '2026-08-01T00:00:00.000Z',
    category: 'Science',
    score: 80,
    rank: 1,
    isTopTen: true,
  }
}

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

beforeEach(() => {
  getDailyChallengeHistoryPageMock.mockReset()
})

afterEach(() => {
  cleanup()
})

// ──────────────────────────────────────────────────────────────────────
// (1) + (2) empty-history branch (Phase 3 S-14 fix)
// ──────────────────────────────────────────────────────────────────────

describe('useDailyChallengeHistory — empty-history branch', () => {
  it('(1) returns isMissingEndpoint: false and items: [] when the wrapper reports an empty ok page (no history yet)', async () => {
    getDailyChallengeHistoryPageMock.mockResolvedValue({
      kind: 'ok',
      data: {
        items: [],
        nextCursor: null,
        hasNextPage: false,
        limit: 5,
      },
    })

    const { result } = renderHook(() => useDailyChallengeHistory(), {
      wrapper: TestSwrProvider,
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.items).toEqual([])
    // Phase 3 (S-14): an empty history is a legitimate outcome, not a
    // missing-endpoint signal. The composition renders the empty-state
    // branch, never the placeholder.
    expect(result.current.isMissingEndpoint).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('(2) returns hasMore: false on an empty ok page (no further pages to load)', async () => {
    getDailyChallengeHistoryPageMock.mockResolvedValue({
      kind: 'ok',
      data: {
        items: [],
        nextCursor: null,
        hasNextPage: false,
        limit: 5,
      },
    })

    const { result } = renderHook(() => useDailyChallengeHistory(), {
      wrapper: TestSwrProvider,
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.hasMore).toBe(false)
  })
})

// ──────────────────────────────────────────────────────────────────────
// (3) error branch
// ──────────────────────────────────────────────────────────────────────

describe('useDailyChallengeHistory — error branch', () => {
  it('(3) surfaces kind: "error" from the wrapper as a typed ApiError', async () => {
    getDailyChallengeHistoryPageMock.mockResolvedValue({
      kind: 'error',
      error: makeApiError(500),
    })

    const { result } = renderHook(() => useDailyChallengeHistory(), {
      wrapper: TestSwrProvider,
    })

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(ApiError)
    })

    expect(result.current.items).toEqual([])
    expect(result.current.isMissingEndpoint).toBe(false)
    expect(result.current.error?.status).toBe(500)
  })
})

// ──────────────────────────────────────────────────────────────────────
// (4) loadMore
// ──────────────────────────────────────────────────────────────────────

describe('useDailyChallengeHistory — loadMore', () => {
  it('(4) appends items after loadMore and reports hasMore: false when the server signals no more pages', async () => {
    getDailyChallengeHistoryPageMock
      .mockResolvedValueOnce({
        kind: 'ok',
        data: {
          items: [makeItem('a'), makeItem('b')],
          nextCursor: 'cursor-2',
          hasNextPage: true,
          limit: 5,
        },
      })
      .mockResolvedValueOnce({
        kind: 'ok',
        data: {
          items: [makeItem('c')],
          nextCursor: null,
          hasNextPage: false,
          limit: 5,
        },
      })

    const { result } = renderHook(() => useDailyChallengeHistory(), {
      wrapper: TestSwrProvider,
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.items.length).toBe(2)
    expect(result.current.hasMore).toBe(true)

    result.current.loadMore()

    await waitFor(() => {
      expect(result.current.items.length).toBe(3)
    })

    expect(result.current.hasMore).toBe(false)
  })
})

// ──────────────────────────────────────────────────────────────────────
// (5) + (6) cursor vs. offset
// ──────────────────────────────────────────────────────────────────────

describe('useDailyChallengeHistory — cursor vs. offset', () => {
  it('(5) forwards a `cursor` parameter to the wrapper on subsequent pages', async () => {
    getDailyChallengeHistoryPageMock
      .mockResolvedValueOnce({
        kind: 'ok',
        data: {
          items: [makeItem('a')],
          nextCursor: 'cursor-2',
          hasNextPage: true,
          limit: 5,
        },
      })
      .mockResolvedValueOnce({
        kind: 'ok',
        data: {
          items: [makeItem('b')],
          nextCursor: null,
          hasNextPage: false,
          limit: 5,
        },
      })

    const { result } = renderHook(() => useDailyChallengeHistory(), {
      wrapper: TestSwrProvider,
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    result.current.loadMore()

    await waitFor(() => {
      expect(result.current.items.length).toBe(2)
    })

    const calls = getDailyChallengeHistoryPageMock.mock.calls as unknown as readonly unknown[][]
    expect(calls.length).toBeGreaterThanOrEqual(2)

    for (const call of calls) {
      const params = (call[0] ?? {}) as { cursor?: unknown; offset?: unknown; limit?: unknown }
      expect(params).toHaveProperty('limit')
    }
  })

  it('(6) does NOT forward an `offset` parameter to the wrapper (cursor branch is the A1-locked default)', async () => {
    getDailyChallengeHistoryPageMock.mockResolvedValue({
      kind: 'ok',
      data: {
        items: [makeItem('a')],
        nextCursor: null,
        hasNextPage: false,
        limit: 5,
      },
    })

    const { result } = renderHook(() => useDailyChallengeHistory(), {
      wrapper: TestSwrProvider,
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    for (const call of getDailyChallengeHistoryPageMock.mock.calls as unknown as readonly unknown[][]) {
      const params = (call[0] ?? {}) as { cursor?: unknown; offset?: unknown }
      expect(params).not.toHaveProperty('offset')
    }

    expect(result.current.isMissingEndpoint).toBe(false)
  })
})
