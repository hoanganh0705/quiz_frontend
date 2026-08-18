

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import type { AxiosError, AxiosResponse } from 'axios'

import { ApiError } from '@/lib/api'
import type {
PaginatedResponseMetaDtoPagination,
PaginationMetaDto
} from '@/lib/api/generated/schemas'

export interface CursorPage<T> {
items: readonly T[]
nextCursor: string | null
hasNextPage: boolean
limit: number
}

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

export type ProblemDetailFixture =
| '401-unauthorized'
  | '404-not-found'
  | '409-conflict'
  | '422-validation'
  | '429-too-many'
  | 'unknown-code'

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

export type { PaginatedResponseMetaDtoPagination, PaginationMetaDto }
