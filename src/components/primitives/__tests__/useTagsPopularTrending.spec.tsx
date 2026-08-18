

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'

import { ApiError } from '@/lib/api'
import type { RankedTagResponseDto } from '@/lib/api/generated/schemas'

import { useTagsPopular } from '@/features/tags/hooks/useTagsPopular'
import { useTagsTrending } from '@/features/tags/hooks/useTagsTrending'

const getTagsPopularMock = vi.fn()
const getTagsTrendingMock = vi.fn()

vi.mock('@/features/tags/services/tags.service', () => ({
listTags: vi.fn(),
getTagBySlug: vi.fn(),
getTag: vi.fn(),
getTagsPopular: (...args: unknown[]) => getTagsPopularMock(...args),
getTagsTrending: (...args: unknown[]) => getTagsTrendingMock(...args),
getTagQuizzes: vi.fn(),
getRelatedTags: vi.fn(),
getTagAnalytics: vi.fn(),
createTag: vi.fn(),
updateTag: vi.fn(),
deleteTag: vi.fn(),
}))

function makeRankedTag(
overrides: Partial<RankedTagResponseDto> = {},
): RankedTagResponseDto {
return {
rank: 1,
tagId: '0192f4d8-0000-7000-8000-000000000001',
name: 'javascript',
slug: 'javascript',
totalScore: '100',
totalAttempts: '50',
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
tags?: unknown[]
analytics?: unknown
notFound?: boolean
error?: ApiError | null
isLoading?: boolean
    }
const snapshot = {
tagsLength: v.tags ? v.tags.length : null,
hasAnalytics: v.analytics !== undefined,
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
getTagsPopularMock.mockReset()
getTagsTrendingMock.mockReset()
})

describe('useTagsPopular — happy path', () => {
it('returns the wrapper-resolved list with isLoading=false and error=null', async () => {
const list: RankedTagResponseDto[] = [
makeRankedTag({ rank: 1, name: 'javascript', slug: 'javascript' }),
makeRankedTag({
rank: 2,
name: 'typescript',
slug: 'typescript',
tagId: '0192f4d8-0000-7000-8000-000000000002',
      }),
makeRankedTag({
rank: 3,
name: 'python',
slug: 'python',
tagId: '0192f4d8-0000-7000-8000-000000000003',
      }),
    ]
getTagsPopularMock.mockResolvedValue({ data: list })

const Probe = makeProbe(() => useTagsPopular({ limit: 10 }))

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

expect(getTagsPopularMock).toHaveBeenCalledWith({ limit: 10 })
  })
})

describe('useTagsPopular — error path', () => {
it('returns an empty list with error.status=500 when the wrapper throws', async () => {
getTagsPopularMock.mockRejectedValue(makeApiError(500))

const Probe = makeProbe(() => useTagsPopular({ limit: 10 }))

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

describe('useTagsPopular — SWR-key stability', () => {
it('two calls with the same params produce the same SWR key (single fetcher call)', async () => {
getTagsPopularMock.mockResolvedValue({
data: [makeRankedTag({ rank: 1 })],
    })

function DoubleProbe() {
const a = useTagsPopular({ limit: 10 })
const b = useTagsPopular({ limit: 10 })
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

expect(getTagsPopularMock).toHaveBeenCalledTimes(1)
  })
})

describe('useTagsTrending — happy path', () => {
it('returns the wrapper-resolved list with isLoading=false and error=null', async () => {
const list: RankedTagResponseDto[] = [
makeRankedTag({ rank: 1, name: 'trending-1', slug: 'trending-1' }),
makeRankedTag({
rank: 2,
name: 'trending-2',
slug: 'trending-2',
tagId: '0192f4d8-0000-7000-8000-000000000002',
      }),
    ]
getTagsTrendingMock.mockResolvedValue({ data: list })

const Probe = makeProbe(() => useTagsTrending({ limit: 10 }))

render(
<TestSwrProvider>
<Probe />
</TestSwrProvider>,
    )

await waitFor(() => {
const snap = readProbe()
expect(snap.tagsLength).toBe(2)
expect(snap.errorStatus).toBeNull()
expect(snap.isLoading).toBe(false)
    })

expect(getTagsTrendingMock).toHaveBeenCalledWith({ limit: 10 })
  })
})

describe('useTagsTrending — error path', () => {
it('returns an empty list with error.status=500 when the wrapper throws', async () => {
getTagsTrendingMock.mockRejectedValue(makeApiError(500))

const Probe = makeProbe(() => useTagsTrending({ limit: 10 }))

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

describe('useTagsTrending — SWR-key stability', () => {
it('two calls with the same params produce the same SWR key (single fetcher call)', async () => {
getTagsTrendingMock.mockResolvedValue({
data: [makeRankedTag({ rank: 1 })],
    })

function DoubleProbe() {
const a = useTagsTrending({ limit: 10 })
const b = useTagsTrending({ limit: 10 })
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

expect(getTagsTrendingMock).toHaveBeenCalledTimes(1)
  })
})
