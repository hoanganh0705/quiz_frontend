

import { describe, expect, it } from 'vitest'

import {
mockCategoryResponseDto,
mockQuizListItemDto,
mockTagResponseDto
} from './render-helpers'

describe('render-helpers DTO factories', () => {
describe('mockQuizListItemDto', () => {
it('returns a default entity whose id is UUIDv7-shaped', () => {
const q = mockQuizListItemDto()
expect(q.quizId).toMatch(
/^0192f4d8-[0-9a-f]{4}-7000-8000-[0-9a-f]{12}$/i
      )
    })

it('respects overrides at the top level', () => {
const q = mockQuizListItemDto({ title: 'Overridden', isFeatured: true })
expect(q.title).toBe('Overridden')
expect(q.isFeatured).toBe(true)
    })

it('keeps id-shaped fields UUIDv7 even when overridden', () => {
const validId = '0192f4d8-1111-7000-8000-000000000000'
const q = mockQuizListItemDto({ quizId: validId })
expect(q.quizId).toBe(validId)
    })

it('throws if an override violates the UUIDv7 shape', () => {
expect(() => mockQuizListItemDto({ quizId: 'not-a-uuid' })).toThrow(
/UUIDv7/
      )
    })
  })

describe('mockCategoryResponseDto', () => {
it('returns a default category with id and slug', () => {
const c = mockCategoryResponseDto()
expect(c.categoryId).toMatch(
/^0192f4d8-[0-9a-f]{4}-7000-8000-[0-9a-f]{12}$/i
      )
expect(c.slug).toBe('sample-category')
expect(c.name).toBe('Sample category')
    })

it('respects overrides', () => {
const c = mockCategoryResponseDto({ name: 'Math', slug: 'math' })
expect(c.name).toBe('Math')
expect(c.slug).toBe('math')
    })

it('throws if categoryId override is not UUIDv7-shaped', () => {
expect(() => mockCategoryResponseDto({ categoryId: 'nope' })).toThrow(
/UUIDv7/
      )
    })
  })

describe('mockTagResponseDto', () => {
it('returns a default tag', () => {
const t = mockTagResponseDto()
expect(t.tagId).toMatch(
/^0192f4d8-[0-9a-f]{4}-7000-8000-[0-9a-f]{12}$/i
      )
expect(t.slug).toBe('sample-tag')
    })

it('respects overrides', () => {
const t = mockTagResponseDto({ slug: 'algebra' })
expect(t.slug).toBe('algebra')
    })

it('throws if tagId override is not UUIDv7-shaped', () => {
expect(() => mockTagResponseDto({ tagId: 'nope' })).toThrow(/UUIDv7/)
    })
  })
})