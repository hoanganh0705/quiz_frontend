

import { describe, expect, it } from 'vitest'

import {
makeApiErrorFromFixture,
makeCursorPage,
makeMultiPageCursorResponse
} from './cursor-pagination'

import { ApiError } from '@/lib/api'

describe('cursor-pagination fixture builders — module exports', () => {
it('exports the three builders as named functions', () => {
expect(typeof makeCursorPage).toBe('function')
expect(typeof makeMultiPageCursorResponse).toBe('function')
expect(typeof makeApiErrorFromFixture).toBe('function')
  })
})

describe('makeCursorPage', () => {
it('round-trips a single page with the documented shape', () => {
const page = makeCursorPage({
items: [{ id: 'a' }, { id: 'b' }],
nextCursor: 'cursor-2',
hasNextPage: true,
limit: 2
    })
expect(page).toEqual({
items: [{ id: 'a' }, { id: 'b' }],
nextCursor: 'cursor-2',
hasNextPage: true,
limit: 2
    })
  })

it('defaults `limit` to `items.length` when not provided', () => {
const page = makeCursorPage({
items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
nextCursor: null,
hasNextPage: false
    })
expect(page.limit).toBe(3)
  })
})

describe('makeMultiPageCursorResponse', () => {
it('builds N pages with the last page terminating the cursor', () => {
const pages = makeMultiPageCursorResponse({ pages: 3, itemsPerPage: 2 })
expect(pages).toHaveLength(3)

expect(pages[0]?.nextCursor).toBe('cursor-2')
expect(pages[0]?.hasNextPage).toBe(true)
expect(pages[1]?.nextCursor).toBe('cursor-3')
expect(pages[1]?.hasNextPage).toBe(true)

expect(pages[2]?.nextCursor).toBeNull()
expect(pages[2]?.hasNextPage).toBe(false)

expect(pages[0]?.items).toHaveLength(2)
expect(pages[0]?.items[0]?.id).toBe('page-1-item-1')
expect(pages[2]?.items[1]?.id).toBe('page-3-item-2')
  })

it('rejects `pages < 1` with a clear error', () => {
expect(() =>
makeMultiPageCursorResponse({ pages: 0 })
    ).toThrow(/pages.*>= 1/)
  })
})

describe('makeApiErrorFromFixture', () => {
it('loads a 404-not-found fixture and exposes QUIZ_NOT_FOUND on the ApiError', () => {
const err = makeApiErrorFromFixture('404-not-found')
expect(err).toBeInstanceOf(ApiError)
expect(err.status).toBe(404)
expect(err.code).toBe('QUIZ_NOT_FOUND')
expect(err.requestId).toBe('req-001')
  })

it('loads a 429-too-many fixture and exposes AUTH_RATE_LIMITED on the ApiError', () => {
const err = makeApiErrorFromFixture('429-too-many')
expect(err).toBeInstanceOf(ApiError)
expect(err.status).toBe(429)
expect(err.code).toBe('AUTH_RATE_LIMITED')
  })

it('accepts an explicit { path } argument', () => {
const err = makeApiErrorFromFixture({
path: process.cwd() + '/src/lib/api/core/__fixtures__/problem-detail/404-not-found.json'
    })
expect(err).toBeInstanceOf(ApiError)
expect(err.code).toBe('QUIZ_NOT_FOUND')
  })
})
