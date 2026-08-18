

import { describe, expect, it } from 'vitest'

import { ApiError } from '@/lib/api/core/ApiError'

import type {
CursorFetcher,
CursorFetcherArgs,
CursorPage,
CursorPageFallbackData,
OffsetFetcher,
OffsetFetcherArgs,
OffsetPage,
OffsetPageFallbackData,
OffsetParams,
PaginationKind,
UseCursorPaginatedParams,
UseCursorPaginatedResult
} from '@/lib/api/use-cursor-paginated.types'

type Equal<X, Y> =
(<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2)
    ? true
    : false

type Expect<T extends true> = T

describe('TKT-3.2.C2 / public types are exported and assignable', () => {
it('PaginationKind union accepts both literals', () => {
const a: PaginationKind = 'cursor'
const b: PaginationKind = 'offset'
expect([a, b]).toHaveLength(2)
  })

it('CursorPage<T> matches a hand-written sample shape', () => {
const sample: CursorPage<{ id: string; title: string }> = {
items: [{ id: 'q-1', title: 'Hello' }],
nextCursor: 'cursor-2',
hasNextPage: true,
limit: 25
    }

type _Assert = Expect<Equal<
(typeof sample)['items'],
readonly { id: string; title: string }[]
    >>
void (null as unknown as _Assert)
expect(sample.nextCursor).toBe('cursor-2')
  })

it('OffsetPage<T> matches a hand-written sample shape', () => {
const sample: OffsetPage<{ id: string }> = {
items: [{ id: 'q-1' }],
page: 1,
total: 50,
hasMore: true,
limit: 25
    }
expect(sample.total).toBe(50)
  })

it('CursorFetcher<T, P> accepts the expected function shape', () => {
const fn: CursorFetcher<{ id: string }, { filter: string }> = async (
args: CursorFetcherArgs<{ filter: string }>
    ) => {
void args
return {
items: [],
nextCursor: null,
hasNextPage: false,
limit: 25
      }
    }
expect(typeof fn).toBe('function')
  })

it('OffsetFetcher<T, P> accepts the expected function shape', () => {
const fn: OffsetFetcher<{ id: string }, { filter: string }> = async (
args: OffsetFetcherArgs<{ filter: string }>
    ) => {
void args
return {
items: [],
page: 0,
total: 0,
hasMore: false,
limit: 25
      }
    }
expect(typeof fn).toBe('function')
  })

it('UseCursorPaginatedParams discriminated union accepts the cursor branch', () => {
const params: UseCursorPaginatedParams<{ id: string }, { q: string }> = {
key: ['quizzes', { q: 'foo' }],
paginationKind: 'cursor',
params: { q: 'foo' },
fetcher: async () => ({
items: [],
nextCursor: null,
hasNextPage: false,
limit: 25
      })
    }
expect(params.paginationKind).toBe('cursor')
  })

it('UseCursorPaginatedParams discriminated union accepts the offset branch', () => {
const params: UseCursorPaginatedParams<{ id: string }, { q: string }> = {
key: ['tournaments'],
paginationKind: 'offset',
params: { q: 'foo' },
fetcher: async () => ({
items: [],
page: 0,
total: 0,
hasMore: false,
limit: 25
      })
    }
expect(params.paginationKind).toBe('offset')
  })

it('UseCursorPaginatedResult<T> matches the Story 3.2 line-183 field set verbatim', () => {
const result: UseCursorPaginatedResult<{ id: string }> = {
items: [],
isLoading: true,
isLoadingMore: false,
hasMore: true,
loadMore: () => {
void 0
      },
error: null,
refresh: async () => {
void 0
      }
    }

const _fields: Pick<
UseCursorPaginatedResult<{ id: string }>,
| 'items'
      | 'isLoading'
      | 'isLoadingMore'
      | 'hasMore'
      | 'loadMore'
      | 'error'
      | 'refresh'
    > = result
void _fields
expect(result.isLoading).toBe(true)
  })
})

describe('TKT-3.2.C2 / discriminator narrowing + error typing', () => {
it('a CursorFetcher cannot be assigned where an OffsetFetcher is expected after `paginationKind: "offset"`', () => {

const valid: OffsetParams<{ id: string }, { q: string }> = {
key: ['x'],
paginationKind: 'offset',
params: { q: 'foo' },
fetcher: async () => ({
items: [],
page: 0,
total: 0,
hasMore: false,
limit: 25
      })
    }
expect(valid.paginationKind).toBe('offset')

const _cursorFetcher: CursorFetcher<{ id: string }, { q: string }> = async () => ({
items: [],
nextCursor: null,
hasNextPage: false,
limit: 25
    })
const invalid: OffsetParams<{ id: string }, { q: string }> = {
key: ['x'],
paginationKind: 'offset',
params: { q: 'foo' },

fetcher: _cursorFetcher
    }
void invalid
  })

it('a non-ApiError cannot be assigned to the `error` field of the result', () => {

const result: UseCursorPaginatedResult<{ id: string }> = {
items: [],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: () => {
void 0
      },

error: new Error('boom'),
refresh: async () => {
void 0
      }
    }
void result

const axiosStub = {
response: {
data: { status: 500, title: 'Internal Server Error' },
status: 500,
statusText: 'Internal Server Error',
headers: {},
config: {} as never
      },
message: 'boom',
isAxiosError: true,
name: 'AxiosError',
toJSON: () => ({})
    } as never
const valid: UseCursorPaginatedResult<{ id: string }> = {
items: [],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: () => {
void 0
      },
error: ApiError.fromAxios(axiosStub),
refresh: async () => {
void 0
      }
    }
expect(valid.error).toBeInstanceOf(ApiError)
  })
})

describe('TKT-3.2.C2 / SSR fallback data shapes (D7)', () => {
it('CursorPageFallbackData matches a hand-written sample', () => {
const fallback: CursorPageFallbackData<{ id: string }> = {
items: [{ id: 'q-1' }],
nextCursor: 'c-2',
hasNextPage: true
    }
expect(fallback.hasNextPage).toBe(true)
  })

it('OffsetPageFallbackData matches a hand-written sample', () => {
const fallback: OffsetPageFallbackData<{ id: string }> = {
items: [{ id: 'q-1' }],
page: 1,
total: 25,
hasMore: true
    }
expect(fallback.page).toBe(1)
  })
})

describe('TKT-3.2.C2 / generic P keeps the contract reusable', () => {
it('a cursor fetcher with a string-P shape is assignable', () => {
type ListParams = { q: string; tag?: string }
const fn: CursorFetcher<{ id: string }, ListParams> = async () => ({
items: [],
nextCursor: null,
hasNextPage: false,
limit: 25
    })

const params: UseCursorPaginatedParams<{ id: string }, ListParams> = {
key: ['items', 'list'],
paginationKind: 'cursor',
params: { q: 'foo' },
fetcher: fn
    }
expect(params.params.q).toBe('foo')
  })
})
