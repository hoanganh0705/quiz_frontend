/**
 * Cursor-pagination fixture builders for hook tests.
 *
 * Source epic:   Epic 3.2 — Cursor pagination primitive (`useCursorPaginated`).
 * Source story:  PHASE_3_EPICS.md → Story 3.2, acceptance criterion #4.
 * Source ticket: TKT-3.2.B3.
 *
 * Three builders:
 *
 *   1. `makeCursorPage<T>({ items, nextCursor, hasNextPage, limit })` —
 *      builds the post-`unwrap` inner shape that the hook's fetcher is
 *      expected to return (per Story 3.2 line 235: a fetcher returns
 *      `{ items, nextCursor }` for cursor pagination, with `hasNextPage`
 *      implied by `nextCursor !== null`).
 *
 *   2. `makeMultiPageCursorResponse<T>({ pages, itemsPerPage, limit })` —
 *      builds an array of N consecutive pages, where the first page's
 *      `nextCursor` is `"cursor-2"`, the second is `"cursor-3"`, etc.,
 *      and the last page's `nextCursor` is `null` with `hasNextPage: false`.
 *
 *   3. `makeApiErrorFromFixture(jsonFixturePath)` — loads one of the
 *      existing RFC 7807 problem-detail fixtures and constructs an
 *      `ApiError` from it (no real axios instance required).
 *
 * Wire-shape contract (the A1 evidence report `EPIC_3_2_A1.md` §3 is the
 * canonical source of truth for the field names). The cursor discriminator
 * is `kind === 'cursor'` and the required fields are `kind`, `limit`,
 * `nextCursor`, `hasNextPage`. The builders below produce shapes that
 * match the discriminated `PaginationMetaDto` from the generated SDK.
 *
 * Picked up by the `node` vitest project (no DOM required). The file
 * imports `fs` and `path` (Node built-ins only) and `ApiError` from
 * `@/lib/api`; it does not import `axios` directly, per the project-wide
 * `no-restricted-imports` rule (the API barrel is the only place that
 * may import `axios`).
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import type { AxiosError, AxiosResponse } from 'axios'

import { ApiError } from '@/lib/api'
import type {
  PaginatedResponseMetaDtoPagination,
  PaginationMetaDto
} from '@/lib/api/generated/schemas'

// ---------------------------------------------------------------------------
// 1. makeCursorPage — single post-`unwrap` page
// ---------------------------------------------------------------------------

/**
 * The post-`unwrap` inner value a cursor-paginated fetcher returns.
 *
 * Matches the contract in Story 3.2 line 235: `{ items, nextCursor }`
 * for cursor pagination, with `hasNextPage` exposed as a sibling so the
 * hook can avoid the implicit `nextCursor !== null` rule and assert the
 * server's `hasNextPage` flag directly (defensive against a server bug
 * that returns `nextCursor: null` with `hasNextPage: true`, or vice
 * versa).
 */
export interface CursorPage<T> {
  items: readonly T[]
  nextCursor: string | null
  hasNextPage: boolean
  limit: number
}

/**
 * Build a single cursor-paginated page.
 *
 * @param params.items       - The items for this page.
 * @param params.nextCursor  - Opaque cursor for the next page, or `null`
 *                            when this is the last page.
 * @param params.hasNextPage - Server-reported "more pages exist" flag.
 * @param params.limit       - Page size (defaults to `params.items.length`).
 */
export function makeCursorPage<T>(params: {
  items: readonly T[]
  nextCursor: string | null
  hasNextPage: boolean
  limit?: number
}): CursorPage<T> {
  const limit = params.limit ?? params.items.length
  return {
    items: params.items,
    nextCursor: params.nextCursor,
    hasNextPage: params.hasNextPage,
    limit
  }
}

// ---------------------------------------------------------------------------
// 2. makeMultiPageCursorResponse — N consecutive pages
// ---------------------------------------------------------------------------

/**
 * Build N consecutive cursor-paginated pages, with the last page's
 * `nextCursor` set to `null` and `hasNextPage: false`.
 *
 * Each page's `items` is an array of `{ id: string, pageIndex: number }`
 * objects (the minimal item shape the hook's `useSWRInfinite` deduplicates
 * on). Callers needing a richer item shape can post-process the pages.
 *
 * @param params.pages         - Number of pages to build (≥ 1).
 * @param params.itemsPerPage  - Items per page (≥ 0). Defaults to 3.
 * @param params.limit         - Page size stamped into each page's `limit`.
 *                              Defaults to `params.itemsPerPage`.
 */
export function makeMultiPageCursorResponse(
  params: { pages: number; itemsPerPage?: number; limit?: number } = {
    pages: 1
  }
): CursorPage<{ id: string; pageIndex: number }>[] {
  if (params.pages < 1) {
    throw new Error(
      '[cursor-pagination fixture] `pages` must be >= 1; got ' + params.pages
    )
  }
  const itemsPerPage = params.itemsPerPage ?? 3
  const limit = params.limit ?? itemsPerPage
  const out: CursorPage<{ id: string; pageIndex: number }>[] = []

  for (let i = 0; i < params.pages; i++) {
    const isLast = i === params.pages - 1
    const items = Array.from({ length: itemsPerPage }, (_, j) => ({
      id: `page-${i + 1}-item-${j + 1}`,
      pageIndex: i
    }))
    out.push({
      items,
      nextCursor: isLast ? null : `cursor-${i + 2}`,
      hasNextPage: !isLast,
      limit
    })
  }

  return out
}

// ---------------------------------------------------------------------------
// 3. makeApiErrorFromFixture — load a problem-detail JSON and wrap it
// ---------------------------------------------------------------------------

/**
 * The set of fixture paths the helper knows about. Callers may pass any
 * other absolute path; the list is for discoverability (TypeScript will
 * flag typos when a string literal is passed).
 */
export type ProblemDetailFixture =
  | '401-unauthorized'
  | '404-not-found'
  | '409-conflict'
  | '422-validation'
  | '429-too-many'
  | 'unknown-code'

/**
 * Build an `ApiError` from a problem-detail JSON file.
 *
 * The helper accepts either:
 *   - A `ProblemDetailFixture` name (e.g. `'404-not-found'`) which is
 *     resolved relative to
 *     `src/lib/api/core/__fixtures__/problem-detail/`.
 *   - An explicit `{ path: string }` argument for any other JSON file.
 *
 * The function reads the file, constructs a minimal `AxiosError` stub
 * whose `response.data` is the JSON body, and passes it through
 * `ApiError.fromAxios`. No real network call is made.
 *
 * The returned `ApiError` is typed correctly (the `code` getter reads
 * from the `extensions.code` field, the `status` getter reads from
 * `status` / `response.status`).
 */
export function makeApiErrorFromFixture(
  arg: ProblemDetailFixture | { path: string }
): ApiError {
  const filePath =
    typeof arg === 'string'
      ? resolve(
          process.cwd(),
          'src/lib/api/core/__fixtures__/problem-detail',
          `${arg}.json`
        )
      : resolve(arg.path)
  const body = JSON.parse(readFileSync(filePath, 'utf-8')) as Record<
    string,
    unknown
  >
  const status =
    typeof body['status'] === 'number' ? (body['status'] as number) : 500
  return ApiError.fromAxios(buildAxiosErrorStub(body, status))
}

// ---------------------------------------------------------------------------
// Internal: build a minimal AxiosError stub from a problem-detail body
// ---------------------------------------------------------------------------

/**
 * Build a minimal `AxiosError` whose `response.data` is the problem-detail
 * body and whose `response.status` is the problem-detail's `status` field.
 *
 * The stub is enough for `ApiError.fromAxios` to construct a fully-typed
 * `ApiError` (which reads `code`, `detail`, `requestId`, `status` etc.
 * from the response body). The stub does **not** implement every
 * `AxiosError` field — only the ones `ApiError`'s constructor reads.
 */
function buildAxiosErrorStub(
  body: Record<string, unknown>,
  status: number
): AxiosError {
  const response = {
    data: body,
    status,
    statusText: typeof body['title'] === 'string' ? body['title'] : 'Error',
    headers: {},
    config: {} as never
  } as AxiosResponse
  const err = {
    name: 'AxiosError',
    message: 'Fixture-driven axios error stub',
    response,
    isAxiosError: true,
    toJSON: () => ({})
  } as unknown as AxiosError
  return err
}

// ---------------------------------------------------------------------------
// Type-re-export shims (consumers may need to import the wire type too)
// ---------------------------------------------------------------------------

/**
 * Re-export of the wire-side discriminated union so consumers (the hook
 * tests in D-batch) can write `as PaginatedResponseMetaDtoPagination`
 * against a typed cast when building a fully-wrapped page (envelope +
 * meta). The hook itself accepts the post-`unwrap` shape (see
 * `CursorPage` above), so the discriminated union is rarely needed by
 * tests; the re-export is here for completeness.
 */
export type { PaginatedResponseMetaDtoPagination, PaginationMetaDto }
