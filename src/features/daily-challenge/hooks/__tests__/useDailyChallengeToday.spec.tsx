

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'

import { ApiError } from '@/lib/api'

import { useDailyChallengeToday } from '@/features/daily-challenge/hooks/useDailyChallengeToday'

const getDailyChallengeTodayMock = vi.fn(
async (): Promise<{
kind: 'ok' | 'missing-endpoint' | 'error'
data?: unknown
error?: unknown
  }> => {

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

getDailyChallengeToday: (...args: unknown[]) =>
(getDailyChallengeTodayMock as (...a: unknown[]) => unknown)(...args),
    }
  },
)

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
getDailyChallengeTodayMock.mockReset()
})

afterEach(() => {
cleanup()
})

describe('useDailyChallengeToday — missing-endpoint branch', () => {
it('(1) returns isMissingEndpoint: true and challenge: null when the wrapper reports kind: "missing-endpoint"', async () => {
getDailyChallengeTodayMock.mockResolvedValue({ kind: 'missing-endpoint' })

const { result } = renderHook(() => useDailyChallengeToday(), {
wrapper: TestSwrProvider,
    })

await waitFor(() => {
expect(result.current.isLoading).toBe(false)
    })

expect(result.current.challenge).toBeNull()
expect(result.current.isMissingEndpoint).toBe(true)
expect(result.current.error).toBeNull()
  })

it('(2) does not perform a network round-trip on the missing-endpoint branch', async () => {
getDailyChallengeTodayMock.mockResolvedValue({ kind: 'missing-endpoint' })

const before = Date.now()
const { result } = renderHook(() => useDailyChallengeToday(), {
wrapper: TestSwrProvider,
    })
await waitFor(() => {
expect(result.current.isLoading).toBe(false)
    })
const after = Date.now()

expect(after - before).toBeLessThan(100)
expect(result.current.isMissingEndpoint).toBe(true)
  })
})

describe('useDailyChallengeToday — error branch', () => {
it('(3) surfaces kind: "error" from the wrapper as a typed ApiError', async () => {
getDailyChallengeTodayMock.mockResolvedValue({
kind: 'error',
error: makeApiError(500),
    })

const { result } = renderHook(() => useDailyChallengeToday(), {
wrapper: TestSwrProvider,
    })

await waitFor(() => {
expect(result.current.error).toBeInstanceOf(ApiError)
    })

expect(result.current.challenge).toBeNull()
expect(result.current.isMissingEndpoint).toBe(false)
expect(result.current.error?.status).toBe(500)
  })
})

describe('useDailyChallengeToday — ok branch', () => {
it('(4) returns the challenge on kind: "ok"', async () => {
getDailyChallengeTodayMock.mockResolvedValue({
kind: 'ok',
data: {
id: 'challenge-1',
date: '2026-08-02T00:00:00.000Z',
quizId: 'quiz-1',
category: 'Science',
totalQuestions: 5,
rewardXp: 100,
      },
    })

const { result } = renderHook(() => useDailyChallengeToday(), {
wrapper: TestSwrProvider,
    })

await waitFor(() => {
expect(result.current.isLoading).toBe(false)
    })

expect(result.current.challenge).toEqual({
id: 'challenge-1',
date: '2026-08-02T00:00:00.000Z',
quizId: 'quiz-1',
category: 'Science',
totalQuestions: 5,
rewardXp: 100,
    })
expect(result.current.isMissingEndpoint).toBe(false)
expect(result.current.error).toBeNull()
expect(typeof result.current.refresh).toBe('function')
  })

it('(5) isNotFound is always false — the wrapper never surfaces a 404 to the user', async () => {
getDailyChallengeTodayMock.mockResolvedValue({
kind: 'error',
error: makeApiError(404, 'DAILY_CHALLENGE_NOT_FOUND'),
    })

const { result } = renderHook(() => useDailyChallengeToday(), {
wrapper: TestSwrProvider,
    })

await waitFor(() => {
expect(result.current.error).toBeInstanceOf(ApiError)
    })

expect(result.current.isNotFound).toBe(false)
  })
})
