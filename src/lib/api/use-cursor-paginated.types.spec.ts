/**
 * Type-level spec for the `useCursorPaginated` public contract.
 *
 * Source epic:   Epic 3.2 — Cursor pagination primitive.
 * Source ticket: TKT-3.2.C2 — locks the C1 type contract.
 *
 * This file enforces the C1 acceptance criteria by:
 *
 *   1. Asserting positive assignability from hand-written samples to
 *      each exported type (compile-time only — see the `Equal` and
 *      `Expect` helpers below).
 *   2. Asserting the discriminator narrows the fetcher (a
 *      `CursorFetcher` cannot be assigned where `OffsetFetcher` is
 *      expected after `paginationKind: 'offset'`).
 *   3. Asserting the `error` field rejects non-`ApiError` values.
 *
 * The spec is picked up by the `node` vitest project's
 * include glob matching `*.spec.ts` files under `src/`. There are no
 * runtime assertions; vitest's runner executes the empty `it()`
 * placeholders (which pass), and TypeScript's compile step enforces
 * the `@ts-expect-error` directives — if a negative case stops being an
 * error (e.g. someone loosens the `error` field to `unknown`), the
 * `@ts-expect-error` is flagged unused and `pnpm type-check` fails.
 *
 * Conventions: do not add runtime code. The file is a compile-only
 * gate. The vitest runner's only job is to ensure the file is
 * discovered and the empty `it()` blocks pass.
 */

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

/* ── compile-time helpers ──────────────────────────────────────────────── */

/**
 * `Expect<true>` and `Expect<false>` are the standard tsd / ts-expect
 * style assertions. They produce zero runtime cost: the line
 * `const _assert: Expect<…> = true` is checked entirely by
 * TypeScript at compile time. If `X` is not `true`, TypeScript
 * reports `Type 'true' is not assignable to type 'false'` (or
 * vice versa).
 */
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2)
    ? true
    : false

type Expect<T extends true> = T

/* ── positive assertions per exported type ──────────────────────────────── */

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
    // Compile-time: the structural shape is exact (readonly items).
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
    // Compile-time: all Story 3.2 line-183 fields are present and the
    // optional `retryBannerVisible` is omittable.
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

/* ── two negative assertions under `@ts-expect-error` ──────────────────── */

describe('TKT-3.2.C2 / discriminator narrowing + error typing', () => {
  it('a CursorFetcher cannot be assigned where an OffsetFetcher is expected after `paginationKind: "offset"`', () => {
    // Positive side — assignment of an OffsetFetcher to an offset-shaped
    // params — should compile (the line is fine on its own).
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

    // Negative side — the cursor fetcher is structurally incompatible
    // with the offset fetcher slot. The line below must be a
    // compile-time error, captured by `@ts-expect-error`.
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
      // @ts-expect-error — CursorFetcher return shape (nextCursor/hasNextPage)
      // is not assignable to OffsetFetcher return shape (page/total/hasMore).
      fetcher: _cursorFetcher
    }
    void invalid
  })

  it('a non-ApiError cannot be assigned to the `error` field of the result', () => {
    // Negative — a plain Error is not assignable to `error`.
    const result: UseCursorPaginatedResult<{ id: string }> = {
      items: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: () => {
        void 0
      },
      // @ts-expect-error — `Error` is not assignable to `ApiError | null`.
      error: new Error('boom'),
      refresh: async () => {
        void 0
      }
    }
    void result

    // Positive — `ApiError` IS assignable to `error`.
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

/* ── fallback data shapes (D7) ─────────────────────────────────────────── */

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

/* ── generic P keeps the contract open-ended ───────────────────────────── */

describe('TKT-3.2.C2 / generic P keeps the contract reusable', () => {
  it('a cursor fetcher with a string-P shape is assignable', () => {
    type ListParams = { q: string; tag?: string }
    const fn: CursorFetcher<{ id: string }, ListParams> = async () => ({
      items: [],
      nextCursor: null,
      hasNextPage: false,
      limit: 25
    })
    // Compile-time: the fetcher type is assignable to a
    // UseCursorPaginatedParams with the same P.
    const params: UseCursorPaginatedParams<{ id: string }, ListParams> = {
      key: ['items', 'list'],
      paginationKind: 'cursor',
      params: { q: 'foo' },
      fetcher: fn
    }
    expect(params.params.q).toBe('foo')
  })
})
