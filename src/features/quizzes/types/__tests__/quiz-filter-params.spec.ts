/**
 * `quiz-filter-params.spec.ts` — locks the parse / serialize /
 * round-trip / unknown-value coercion contracts.
 *
 * Source epic: Epic 3.5 — Global quizzes list + filters.
 * Source ticket: TKT-3.5.A4.
 *
 * Six cases per the ticket AC #1:
 *
 *   (a) `parseQuizFilterUrl(new URLSearchParams(''))` returns `{}`.
 *   (b) `serializeQuizFilterUrl({})` returns `new URLSearchParams('')`.
 *   (c) Round-trip identity for a full state.
 *   (d) Unknown `sort` value coerces to `'newest'`.
 *   (e) Unknown `difficulty` value coerces to `undefined`.
 *   (f) Unknown / malformed tag slug is silently dropped.
 *
 * (g) The `TAG_SLUG_REGEX` source is asserted verbatim.
 * (h) The empty-string slug case asserts `isValidTagSlug('') === false`.
 */

import { describe, expect, it } from 'vitest'

import {
  TAG_SLUG_REGEX,
  isValidTagSlug,
  parseQuizFilterUrl,
  serializeQuizFilterUrl,
} from '@/features/quizzes/types/quiz-filter-params'

describe('parseQuizFilterUrl — empty input', () => {
  it('returns an empty state when no params are present', () => {
    expect(parseQuizFilterUrl(new URLSearchParams(''))).toEqual({})
  })
})

describe('serializeQuizFilterUrl — empty state', () => {
  it('returns an empty URLSearchParams when state is empty', () => {
    expect(serializeQuizFilterUrl({}).toString()).toBe('')
  })
})

describe('round-trip identity', () => {
  it('parse ∘ serialize is the identity for a full state', () => {
    const original = {
      categoryId: '0192f4d8-0000-7000-8000-000000000abc',
      tagSlugs: ['science', 'math-2'],
      sort: 'popular' as const,
      difficulty: 'easy' as const,
    }
    const url = serializeQuizFilterUrl(original)
    const parsed = parseQuizFilterUrl(url)
    expect(parsed).toEqual(original)
  })

  it('round-trips a single-field state', () => {
    expect(parseQuizFilterUrl(serializeQuizFilterUrl({ sort: 'top_rated' }))).toEqual({
      sort: 'top_rated',
    })
  })
})

describe('parseQuizFilterUrl — unknown-value coercion', () => {
  it('coerces unknown sort values to "newest"', () => {
    const state = parseQuizFilterUrl(new URLSearchParams('sort=foo'))
    expect(state.sort).toBe('newest')
  })

  it('coerces unknown difficulty values to undefined', () => {
    const state = parseQuizFilterUrl(new URLSearchParams('difficulty=foo'))
    expect(state.difficulty).toBeUndefined()
  })

  it('silently drops unknown / malformed tag slugs', () => {
    const state = parseQuizFilterUrl(
      new URLSearchParams('tags=science,Hello%20World,hello_world,math-2'),
    )
    // Only "science" and "math-2" survive the slug regex.
    expect(state.tagSlugs).toEqual(['science', 'math-2'])
  })

  it('preserves the empty-string case as no difficulty', () => {
    const state = parseQuizFilterUrl(new URLSearchParams('difficulty='))
    expect(state.difficulty).toBeUndefined()
  })
})

describe('serializeQuizFilterUrl — minimal URL', () => {
  it('omits empty fields', () => {
    const url = serializeQuizFilterUrl({ sort: 'newest' })
    expect(url.toString()).toBe('sort=newest')
  })

  it('serialises tagSlugs as comma-separated values', () => {
    const url = serializeQuizFilterUrl({ tagSlugs: ['a', 'b', 'c'] })
    expect(url.toString()).toBe('tags=a%2Cb%2Cc')
  })
})

describe('TAG_SLUG_REGEX', () => {
  it('source is asserted verbatim', () => {
    expect(TAG_SLUG_REGEX.source).toBe('^[a-z0-9]+(?:-[a-z0-9]+)*$')
  })

  it('accepts valid slugs', () => {
    expect(isValidTagSlug('tag')).toBe(true)
    expect(isValidTagSlug('tag-2')).toBe(true)
    expect(isValidTagSlug('a-b-c')).toBe(true)
    expect(isValidTagSlug('123')).toBe(true)
    expect(isValidTagSlug('abc123def')).toBe(true)
  })

  it('rejects invalid slugs', () => {
    expect(isValidTagSlug('Hello')).toBe(false)
    expect(isValidTagSlug('Hello World')).toBe(false)
    expect(isValidTagSlug('hello_world')).toBe(false)
    expect(isValidTagSlug('hello--world')).toBe(false)
    expect(isValidTagSlug('hello-')).toBe(false)
    expect(isValidTagSlug('-hello')).toBe(false)
    expect(isValidTagSlug('hello.world')).toBe(false)
    expect(isValidTagSlug('')).toBe(false)
  })
})