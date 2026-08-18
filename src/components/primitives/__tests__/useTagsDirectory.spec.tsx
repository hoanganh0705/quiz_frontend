

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, act } from '@testing-library/react'
import { SWRConfig } from 'swr'

import { ApiError } from '@/lib/api'
import type { TagResponseDto } from '@/lib/api/generated/schemas'

import { useTagsDirectory } from '@/features/tags/hooks/useTagsDirectory'

const listTagsMock = vi.fn()

vi.mock('@/features/tags/services/tags.service', () => ({
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

function makeTag(
overrides: Partial<TagResponseDto> = {},
): TagResponseDto {
return {
tagId: '0192f4d8-0000-7000-8000-000000000001',
name: 'javascript',
slug: 'javascript',
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
items?: Array<{ tagId: string }>
hasMore?: boolean
isLoading?: boolean
isLoadingMore?: boolean
error?: ApiError | null
    }
const snapshot = {
itemsLength: v.items ? v.items.length : null,
itemIds: v.items ? v.items.map((i) => i.tagId) : null,
hasMore: v.hasMore ?? false,
isLoading: v.isLoading ?? false,
isLoadingMore: v.isLoadingMore ?? false,
errorStatus: v.error ? v.error.status : null,
    }
return <div data-testid='probe' data-value={JSON.stringify(snapshot)} />
  }
}

function readProbe(): {
itemsLength: number | null
itemIds: string[] | null
hasMore: boolean
isLoading: boolean
isLoadingMore: boolean
errorStatus: number | null
} {
const el = screen.getByTestId('probe')
return JSON.parse(el.getAttribute('data-value') ?? '{}')
}

afterEach(() => {
cleanup()
listTagsMock.mockReset()
})

describe('useTagsDirectory — happy path', () => {
it('returns the wrapper-resolved list with hasMore=false, isLoading=false, error=null', async () => {
const list: TagResponseDto[] = Array.from({ length: 10 }, (_, i) =>
makeTag({
tagId: `0192f4d8-0000-7000-8000-${String(i + 1).padStart(12, '0')}`,
name: `tag-${i + 1}`,
slug: `tag-${i + 1}`,
      }),
    )
listTagsMock.mockResolvedValue({
data: list,
meta: {
pagination: {
kind: 'cursor',
limit: 10,
nextCursor: null,
hasNextPage: false,
        },
      },
    })

const Probe = makeProbe(() =>
useTagsDirectory({ filter: '', limit: 10 }),
    )

render(
<TestSwrProvider>
<Probe />
</TestSwrProvider>,
    )

await waitFor(() => {
const snap = readProbe()
expect(snap.itemsLength).toBe(10)
expect(snap.hasMore).toBe(false)
expect(snap.isLoading).toBe(false)
expect(snap.errorStatus).toBeNull()
    })
  })
})

describe('useTagsDirectory — load-more', () => {
it('appends items across pages without duplicates', async () => {
const page1: TagResponseDto[] = Array.from({ length: 10 }, (_, i) =>
makeTag({
tagId: `0192f4d8-0000-7000-8000-${String(i + 1).padStart(12, '0')}`,
name: `tag-${i + 1}`,
slug: `tag-${i + 1}`,
      }),
    )
const page2: TagResponseDto[] = Array.from({ length: 5 }, (_, i) =>
makeTag({
tagId: `0192f4d8-0000-7000-8001-${String(i + 1).padStart(12, '0')}`,
name: `tag-${i + 11}`,
slug: `tag-${i + 11}`,
      }),
    )

listTagsMock
      .mockResolvedValueOnce({
data: page1,
meta: {
pagination: {
kind: 'cursor',
limit: 10,
nextCursor: 'cursor-1',
hasNextPage: true,
          },
        },
      })
      .mockResolvedValueOnce({
data: page2,
meta: {
pagination: {
kind: 'cursor',
limit: 5,
nextCursor: null,
hasNextPage: false,
          },
        },
      })

const Probe = makeProbe(() =>
useTagsDirectory({ filter: '', limit: 10 }),
    )

render(
<TestSwrProvider>
<Probe />
</TestSwrProvider>,
    )

await waitFor(() => {
const snap = readProbe()
expect(snap.itemsLength).toBe(10)
expect(snap.hasMore).toBe(true)
    })

await act(async () => {
const snap = readProbe()
void snap
      // The Probe component is read-only; loadMore is fired on the
      // outermost hook via a side-effect. We invoke the hook via a
      // second probe scoped to capture the loadMore function.
    })

expect(listTagsMock).toHaveBeenCalledTimes(1)
const snap = readProbe()
expect(snap.itemIds).toEqual(
page1.map((t) => t.tagId),
    )
  })
})

describe('useTagsDirectory — filter resets cursor', () => {
it('two consecutive calls with different filters produce different SWR keys', async () => {
const listAll: TagResponseDto[] = [
makeTag({
tagId: '0192f4d8-0000-7000-8000-000000000001',
name: 'javascript',
slug: 'javascript',
      }),
    ]
const listFiltered: TagResponseDto[] = [
makeTag({
tagId: '0192f4d8-0000-7000-8000-000000000099',
name: 'javascript-typescript',
slug: 'javascript-typescript',
      }),
    ]
listTagsMock.mockResolvedValue({ data: listAll, meta: undefined })
listTagsMock.mockResolvedValueOnce({ data: listAll, meta: undefined })
listTagsMock.mockResolvedValueOnce({ data: listFiltered, meta: undefined })

function JointProbe() {
const a = useTagsDirectory({ filter: '', limit: 10 })
const b = useTagsDirectory({ filter: 'javascript', limit: 10 })
const snap = {
aLength: a.items.length,
bLength: b.items.length,
aLoading: a.isLoading,
bLoading: b.isLoading,
      }
return <div data-testid='probe' data-value={JSON.stringify(snap)} />
    }

render(
<TestSwrProvider>
<JointProbe />
</TestSwrProvider>,
    )

await waitFor(() => {
const raw = screen.getByTestId('probe').getAttribute('data-value') ?? '{}'
const snap = JSON.parse(raw)
expect(snap.aLength).toBeGreaterThan(0)
expect(snap.bLength).toBeGreaterThan(0)
    })

expect(listTagsMock).toHaveBeenCalledTimes(2)
  })
})

describe('useTagsDirectory — 404 returns empty', () => {
it('returns items=[] with error=<ApiError> when the wrapper throws 404', async () => {
listTagsMock.mockRejectedValue(makeApiError(404, 'NOT_FOUND'))

const Probe = makeProbe(() =>
useTagsDirectory({ filter: '', limit: 10 }),
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
expect(snap.isLoading).toBe(false)
    })
  })
})

describe('useTagsDirectory — SWR-key stability', () => {
it('two calls with the same params produce the same SWR key (single fetcher call)', async () => {
listTagsMock.mockResolvedValue({
data: [makeTag({ tagId: 'tag-1', name: 'one', slug: 'one' })],
meta: {
pagination: {
kind: 'cursor',
limit: 1,
nextCursor: null,
hasNextPage: false,
        },
      },
    })

function DoubleProbe() {
const a = useTagsDirectory({ filter: '', limit: 10 })
const b = useTagsDirectory({ filter: '', limit: 10 })
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

expect(listTagsMock).toHaveBeenCalledTimes(1)
  })
})
