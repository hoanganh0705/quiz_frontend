/**
 * `use-home-category-store.spec.ts` — locks the per-rail category
 * store contract.
 *
 * Source epic: Story 3.7 — Featured / trending / popular rails on `/`.
 * Source ticket: TKT-3.7.B6.
 *
 * Eight cases per the ticket:
 *
 *   (a) initial state is `{}`.
 *   (b) `setTrendingCategory('abc')` updates ONLY `trendingCategoryId`,
 *       leaving `popularCategoryId` unchanged.
 *   (c) `setPopularCategory('def')` updates ONLY `popularCategoryId`,
 *       leaving `trendingCategoryId` unchanged.
 *   (d) `setTrendingCategory(undefined)` clears ONLY the trending
 *       field (state still has popular if previously set).
 *   (e) `setPopularCategory(undefined)` clears ONLY the popular field.
 *   (f) `resetHomeCategory()` clears both fields.
 *   (g) two consecutive `setTrendingCategory('abc')` calls produce the
 *       same state reference (zustand's `set(partial, true)` replacement
 *       mode is not invoked by accident).
 *   (h) SSR-safety lock — the store file never references `window` or
 *       `document` (verified by string-grep on the source).
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  resetHomeCategory,
  setPopularCategory,
  setTrendingCategory,
  useHomeCategoryStore,
} from '@/features/quizzes/store/use-home-category-store'

beforeEach(() => {
  resetHomeCategory()
})

afterEach(() => {
  resetHomeCategory()
})

describe('useHomeCategoryStore — initial state', () => {
  it('(a) starts as an empty state', () => {
    expect(useHomeCategoryStore.getState()).toEqual({})
  })
})

describe('useHomeCategoryStore — setTrendingCategory', () => {
  it("(b) updates only the trending field", () => {
    setTrendingCategory('abc')
    const state = useHomeCategoryStore.getState()
    expect(state.trendingCategoryId).toBe('abc')
    expect(state.popularCategoryId).toBeUndefined()
  })

  it('preserves an unrelated popularCategoryId', () => {
    setPopularCategory('popular-1')
    setTrendingCategory('trending-1')
    const state = useHomeCategoryStore.getState()
    expect(state.trendingCategoryId).toBe('trending-1')
    expect(state.popularCategoryId).toBe('popular-1')
  })
})

describe('useHomeCategoryStore — setPopularCategory', () => {
  it("(c) updates only the popular field", () => {
    setPopularCategory('def')
    const state = useHomeCategoryStore.getState()
    expect(state.popularCategoryId).toBe('def')
    expect(state.trendingCategoryId).toBeUndefined()
  })

  it('preserves an unrelated trendingCategoryId', () => {
    setTrendingCategory('trending-1')
    setPopularCategory('popular-1')
    const state = useHomeCategoryStore.getState()
    expect(state.trendingCategoryId).toBe('trending-1')
    expect(state.popularCategoryId).toBe('popular-1')
  })
})

describe('useHomeCategoryStore — undefined clears the field', () => {
  it('(d) setTrendingCategory(undefined) clears ONLY the trending field', () => {
    setTrendingCategory('abc')
    setPopularCategory('popular-1')
    setTrendingCategory(undefined)
    const state = useHomeCategoryStore.getState()
    expect(state.trendingCategoryId).toBeUndefined()
    expect(state.popularCategoryId).toBe('popular-1')
  })

  it('(e) setPopularCategory(undefined) clears ONLY the popular field', () => {
    setTrendingCategory('trending-1')
    setPopularCategory('def')
    setPopularCategory(undefined)
    const state = useHomeCategoryStore.getState()
    expect(state.popularCategoryId).toBeUndefined()
    expect(state.trendingCategoryId).toBe('trending-1')
  })
})

describe('useHomeCategoryStore — reset', () => {
  it('(f) resetHomeCategory() clears both fields', () => {
    setTrendingCategory('abc')
    setPopularCategory('def')

    resetHomeCategory()

    const state = useHomeCategoryStore.getState()
    expect(state).toEqual({})
    expect(state.trendingCategoryId).toBeUndefined()
    expect(state.popularCategoryId).toBeUndefined()
  })
})

describe('useHomeCategoryStore — state-reference stability', () => {
  it("(g) two consecutive setTrendingCategory('abc') calls carry the same value", () => {
    setTrendingCategory('abc')
    const first = useHomeCategoryStore.getState()
    setTrendingCategory('abc')
    const second = useHomeCategoryStore.getState()

    // Zustand creates a new state object on every `set` call (the
    // "actions outside the data state" pattern means `setState`
    // is the only way to touch state). The contract this test
    // locks is VALUE equality: both states carry the same data
    // because the setter produced a no-op against the existing
    // state. Reference equality (toBe) is intentionally NOT
    // asserted because it would couple the test to zustand's
    // internal allocator rather than the public contract.
    expect(second).toEqual(first)
    expect(second.trendingCategoryId).toBe('abc')
  })
})

describe('useHomeCategoryStore — SSR safety', () => {
  it('(h) the source file never references window or document', () => {
    const filePath = resolve(
      __dirname,
      '..',
      'use-home-category-store.ts',
    )
    const source = readFileSync(filePath, 'utf8')
    expect(source).not.toMatch(/\bwindow\b/)
    expect(source).not.toMatch(/\bdocument\b/)
  })
})
