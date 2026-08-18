

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'

import { SWRConfig } from 'swr'

import { ApiError } from '@/lib/api'
import type { RankedCategoryResponseDto } from '@/lib/api/generated/schemas'

import {
useCategoriesRanked,
} from '@/features/categories/hooks/useCategoriesRanked'
import {
useCategoriesTrending,
} from '@/features/categories/hooks/useCategoriesTrending'

const getCategoriesRankedMock = vi.fn()
const getCategoriesTrendingMock = vi.fn()

vi.mock('@/features/categories/services/categories.service', () => ({
getCategoriesRanked: (...args: unknown[]) =>
getCategoriesRankedMock(...args),
getCategoriesTrending: (...args: unknown[]) =>
getCategoriesTrendingMock(...args),

listCategories: vi.fn(),
getCategoryBySlug: vi.fn(),
getCategory: vi.fn(),
getCategoryQuizzes: vi.fn(),
createCategory: vi.fn(),
updateCategory: vi.fn(),
deleteCategory: vi.fn(),
}))

function makeRankedCategory(
overrides: Partial<RankedCategoryResponseDto> = {},
): RankedCategoryResponseDto {
return {
rank: 1,
categoryId: '0192f4d8-0000-7000-8000-000000000001',
name: 'Science',
slug: 'science',
imageUrl: null,
description: null,
totalScore: '100',
totalAttempts: '50',
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
categories?: unknown[]
category?: unknown
notFound?: boolean
error?: ApiError | null
isLoading?: boolean
    }
const snapshot = {
categoriesLength: v.categories ? v.categories.length : null,
hasCategory: v.category !== undefined,
categoryIsNull: v.category === null,
notFound: v.notFound ?? false,
errorStatus: v.error ? v.error.status : null,
isLoading: v.isLoading ?? false,
    }
return <div data-testid='probe' data-value={JSON.stringify(snapshot)} />
  }
}

function readProbe(): {
categoriesLength: number | null
notFound: boolean
errorStatus: number | null
isLoading: boolean
} {
const el = screen.getByTestId('probe')
return JSON.parse(el.getAttribute('data-value') ?? '{}')
}

afterEach(() => {
cleanup()
getCategoriesRankedMock.mockReset()
getCategoriesTrendingMock.mockReset()
})

describe('useCategoriesRanked — happy path', () => {
it('returns the wrapper-resolved list with isLoading=false and error=null', async () => {
const list: RankedCategoryResponseDto[] = [
makeRankedCategory({ rank: 1, name: 'Science', slug: 'science' }),
makeRankedCategory({
rank: 2,
name: 'History',
slug: 'history',
categoryId: '0192f4d8-0000-7000-8000-000000000002',
      }),
makeRankedCategory({
rank: 3,
name: 'Math',
slug: 'math',
categoryId: '0192f4d8-0000-7000-8000-000000000003',
      }),
    ]
getCategoriesRankedMock.mockResolvedValue({ data: list })

const Probe = makeProbe(() => useCategoriesRanked({ limit: 10 }))

render(
<TestSwrProvider>
<Probe />
</TestSwrProvider>,
    )

await waitFor(() => {
const snap = readProbe()
expect(snap.categoriesLength).toBe(3)
expect(snap.errorStatus).toBeNull()
expect(snap.isLoading).toBe(false)
    })

expect(getCategoriesRankedMock).toHaveBeenCalledWith({ limit: 10 })
  })
})

describe('useCategoriesRanked — error path', () => {
it('returns an empty list with error.status=500 when the wrapper throws', async () => {
getCategoriesRankedMock.mockRejectedValue(makeApiError(500))

const Probe = makeProbe(() => useCategoriesRanked({ limit: 10 }))

render(
<TestSwrProvider>
<Probe />
</TestSwrProvider>,
    )

await waitFor(() => {
const snap = readProbe()
expect(snap.errorStatus).toBe(500)
expect(snap.categoriesLength).toBe(0)
expect(snap.isLoading).toBe(false)
    })
  })
})

describe('useCategoriesRanked — SWR-key stability', () => {
it('two calls with the same params produce the same SWR key (single fetcher call)', async () => {
getCategoriesRankedMock.mockResolvedValue({
data: [makeRankedCategory({ rank: 1 })],
    })

function DoubleProbe() {
const a = useCategoriesRanked({ limit: 10 })
const b = useCategoriesRanked({ limit: 10 })
return (
<div
data-testid='probe'
data-a={a.categories.length}
data-b={b.categories.length}
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

expect(getCategoriesRankedMock).toHaveBeenCalledTimes(1)
  })
})

describe('useCategoriesTrending — happy path', () => {
it('returns the wrapper-resolved list with isLoading=false and error=null', async () => {
const list: RankedCategoryResponseDto[] = [
makeRankedCategory({ rank: 1, name: 'Trending One', slug: 'trending-1' }),
makeRankedCategory({
rank: 2,
name: 'Trending Two',
slug: 'trending-2',
categoryId: '0192f4d8-0000-7000-8000-000000000002',
      }),
    ]
getCategoriesTrendingMock.mockResolvedValue({ data: list })

const Probe = makeProbe(() => useCategoriesTrending({ limit: 10 }))

render(
<TestSwrProvider>
<Probe />
</TestSwrProvider>,
    )

await waitFor(() => {
const snap = readProbe()
expect(snap.categoriesLength).toBe(2)
expect(snap.errorStatus).toBeNull()
expect(snap.isLoading).toBe(false)
    })

expect(getCategoriesTrendingMock).toHaveBeenCalledWith({ limit: 10 })
  })
})

describe('useCategoriesTrending — error path', () => {
it('returns an empty list with error.status=500 when the wrapper throws', async () => {
getCategoriesTrendingMock.mockRejectedValue(makeApiError(500))

const Probe = makeProbe(() => useCategoriesTrending({ limit: 10 }))

render(
<TestSwrProvider>
<Probe />
</TestSwrProvider>,
    )

await waitFor(() => {
const snap = readProbe()
expect(snap.errorStatus).toBe(500)
expect(snap.categoriesLength).toBe(0)
expect(snap.isLoading).toBe(false)
    })
  })
})

describe('useCategoriesTrending — SWR-key stability', () => {
it('two calls with the same params produce the same SWR key (single fetcher call)', async () => {
getCategoriesTrendingMock.mockResolvedValue({
data: [makeRankedCategory({ rank: 1 })],
    })

function DoubleProbe() {
const a = useCategoriesTrending({ limit: 10 })
const b = useCategoriesTrending({ limit: 10 })
return (
<div
data-testid='probe'
data-a={a.categories.length}
data-b={b.categories.length}
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

expect(getCategoriesTrendingMock).toHaveBeenCalledTimes(1)
  })
})
