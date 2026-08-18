

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'

import { ApiError } from '@/lib/api'

import { useLeaderboard } from '@/features/leaderboard/hooks/useLeaderboard'

const getLeaderboardWithPaginationMock = vi.fn()

vi.mock('@/features/leaderboard/services/leaderboard.service', async () => {
const actual =
await vi.importActual<
typeof import('@/features/leaderboard/services/leaderboard.service')
    >('@/features/leaderboard/services/leaderboard.service')
return {
...actual,
getLeaderboardWithPagination: (...args: unknown[]) =>
getLeaderboardWithPaginationMock(...args),
  }
})

function makeEntry(userId: string, rank: number, xp: number) {
return {
rank,
denseRank: rank,
userId,
displayName: `Player ${rank}`,
avatarUrl: null,
xp,
isTied: false,
isCurrentUser: false,
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
getLeaderboardWithPaginationMock.mockReset()
})

afterEach(() => {
cleanup()
})

describe('useLeaderboard — period switch', () => {
it('switching period triggers a new wrapper call and resets entries', async () => {
const weeklyEntries = [
makeEntry('user-1', 1, 100),
makeEntry('user-2', 2, 90),
    ]
const monthlyEntries = [makeEntry('user-7', 1, 500)]
getLeaderboardWithPaginationMock
      .mockResolvedValueOnce({
data: {
entries: weeklyEntries,
totalParticipants: 50,
userPosition: null,
period: { type: 'weekly', start: '2026-08-01T00:00:00.000Z', end: null, resetInSeconds: 604800 },
pagination: { limit: 20, offset: 0, hasMore: false },
        },
      })
      .mockResolvedValueOnce({
data: {
entries: monthlyEntries,
totalParticipants: 200,
userPosition: null,
period: { type: 'monthly', start: '2026-08-01T00:00:00.000Z', end: null, resetInSeconds: 2592000 },
pagination: { limit: 20, offset: 0, hasMore: false },
        },
      })

function PeriodProbe({ period }: { period: 'weekly' | 'monthly' }) {
const { entries, isLoading } = useLeaderboard(period)
return (
<div data-testid='probe' data-value={JSON.stringify({ entries, isLoading })} />
      )
    }

const { rerender } = render(
<TestSwrProvider>
<PeriodProbe period='weekly' />
</TestSwrProvider>,
    )

await waitFor(() => {
const el = document.querySelector('[data-testid="probe"]') as HTMLElement
const snap = JSON.parse(el.dataset.value ?? '{}')
expect(snap.isLoading).toBe(false)
expect(snap.entries.length).toBe(2)
    })

rerender(
<TestSwrProvider>
<PeriodProbe period='monthly' />
</TestSwrProvider>,
    )

await waitFor(() => {
const el = document.querySelector('[data-testid="probe"]') as HTMLElement
const snap = JSON.parse(el.dataset.value ?? '{}')
expect(snap.isLoading).toBe(false)
expect(snap.entries.length).toBe(1)
    })

expect(getLeaderboardWithPaginationMock).toHaveBeenCalledTimes(2)
expect(getLeaderboardWithPaginationMock).toHaveBeenNthCalledWith(
1,
'weekly',
{ limit: 20, offset: 0 },
    )
expect(getLeaderboardWithPaginationMock).toHaveBeenNthCalledWith(
2,
'monthly',
{ limit: 20, offset: 0 },
    )
  })
})

describe('useLeaderboard — empty state', () => {
it('returns `{ entries: [], hasMore: false, error: null }` when server returns no entries', async () => {
getLeaderboardWithPaginationMock.mockResolvedValue({
data: {
entries: [],
totalParticipants: 0,
userPosition: null,
period: { type: 'weekly', start: '2026-08-01T00:00:00.000Z', end: null, resetInSeconds: 604800 },
pagination: { limit: 20, offset: 0, hasMore: false },
      },
    })

const { result } = renderHook(() => useLeaderboard('weekly'), {
wrapper: TestSwrProvider,
    })

await waitFor(() => {
expect(result.current.isLoading).toBe(false)
    })

expect(result.current.entries).toEqual([])
expect(result.current.hasMore).toBe(false)
expect(result.current.error).toBeNull()
  })
})

describe('useLeaderboard — 5xx error', () => {
it('surfaces the typed error without retrying', async () => {
getLeaderboardWithPaginationMock.mockRejectedValue(makeApiError(500))

const { result } = renderHook(() => useLeaderboard('weekly'), {
wrapper: TestSwrProvider,
    })

await waitFor(() => {
expect(result.current.error).toBeInstanceOf(ApiError)
    })

expect(result.current.entries).toEqual([])

expect(result.current.error?.status).toBe(500)
expect(getLeaderboardWithPaginationMock).toHaveBeenCalledTimes(1)
  })
})

describe('useLeaderboard — key stability', () => {
it('two renders with the same period produce one network call', async () => {
getLeaderboardWithPaginationMock.mockResolvedValue({
data: {
entries: [makeEntry('user-1', 1, 100)],
totalParticipants: 50,
userPosition: null,
period: { type: 'weekly', start: '2026-08-01T00:00:00.000Z', end: null, resetInSeconds: 604800 },
pagination: { limit: 20, offset: 0, hasMore: false },
      },
    })

function StableProbe({ period }: { period: 'weekly' | 'monthly' }) {
const { entries, isLoading } = useLeaderboard(period)
return (
<div data-testid='probe' data-value={JSON.stringify({ entries, isLoading })} />
      )
    }

const { rerender } = render(
<TestSwrProvider>
<StableProbe period='weekly' />
</TestSwrProvider>,
    )

await waitFor(() => {
const el = document.querySelector('[data-testid="probe"]') as HTMLElement
expect(JSON.parse(el.dataset.value ?? '{}').isLoading).toBe(false)
    })

rerender(
<TestSwrProvider>
<StableProbe period='weekly' />
</TestSwrProvider>,
    )

await waitFor(() => {
const el = document.querySelector('[data-testid="probe"]') as HTMLElement
expect(JSON.parse(el.dataset.value ?? '{}').entries.length).toBe(1)
    })

expect(getLeaderboardWithPaginationMock).toHaveBeenCalledTimes(1)
  })
})

describe('useLeaderboard — offset-only payload', () => {
it('the wrapper is called with `{ limit, offset }` and never receives a `cursor`', async () => {
const page1 = [makeEntry('user-1', 1, 100), makeEntry('user-2', 2, 90)]
const page2 = [makeEntry('user-3', 3, 80), makeEntry('user-4', 4, 70)]
getLeaderboardWithPaginationMock
      .mockResolvedValueOnce({
data: {
entries: page1,
totalParticipants: 50,
userPosition: null,
period: { type: 'weekly', start: '2026-08-01T00:00:00.000Z', end: null, resetInSeconds: 604800 },
pagination: { limit: 2, offset: 0, hasMore: true },
        },
      })
      .mockResolvedValueOnce({
data: {
entries: page2,
totalParticipants: 50,
userPosition: null,
period: { type: 'weekly', start: '2026-08-01T00:00:00.000Z', end: null, resetInSeconds: 604800 },
pagination: { limit: 2, offset: 2, hasMore: false },
        },
      })

const { result } = renderHook(() => useLeaderboard('weekly'), {
wrapper: TestSwrProvider,
    })

await waitFor(() => {
expect(result.current.isLoading).toBe(false)
expect(result.current.entries.length).toBe(2)
    })

expect(result.current.hasMore).toBe(true)

await waitFor(async () => {
result.current.loadMore()
    })

await waitFor(() => {
expect(result.current.entries.length).toBe(4)
    })

expect(getLeaderboardWithPaginationMock).toHaveBeenCalledTimes(2)
expect(getLeaderboardWithPaginationMock).toHaveBeenNthCalledWith(
1,
'weekly',
{ limit: 20, offset: 0 },
    )
expect(getLeaderboardWithPaginationMock).toHaveBeenNthCalledWith(
2,
'weekly',
{ limit: 20, offset: 20 },
    )

for (const call of getLeaderboardWithPaginationMock.mock.calls) {
const params = call[1] as { limit?: unknown; offset?: unknown; cursor?: unknown }
expect(params).not.toHaveProperty('cursor')
expect(params).toHaveProperty('limit')
expect(params).toHaveProperty('offset')
    }
  })
})
