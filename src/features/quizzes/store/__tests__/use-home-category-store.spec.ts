

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
