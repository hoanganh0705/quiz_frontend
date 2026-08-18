

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
getUrlSearchParams,
resetFilters,
setFilter,
setFromUrlSearchParams,
useQuizFiltersStore,
} from '@/features/quizzes/store/use-quiz-filters-store'

beforeEach(() => {
resetFilters()
})

afterEach(() => {
resetFilters()
})

describe('useQuizFiltersStore — initial state', () => {
it('starts as an empty state', () => {
expect(useQuizFiltersStore.getState()).toEqual({})
  })
})

describe('useQuizFiltersStore — setFilter', () => {
it("setFilter('sort', 'popular') updates only the sort field", () => {
setFilter('sort', 'popular')
const state = useQuizFiltersStore.getState()
expect(state.sort).toBe('popular')
expect(state.categoryId).toBeUndefined()
expect(state.tagSlugs).toBeUndefined()
expect(state.difficulty).toBeUndefined()
  })

it('setFilter(key, undefined) removes the field from the state', () => {
setFilter('sort', 'popular')
setFilter('sort', undefined)
expect(useQuizFiltersStore.getState().sort).toBeUndefined()
  })

it('setFilter preserves unrelated fields', () => {
setFilter('categoryId', 'cat-123')
setFilter('sort', 'newest')
const state = useQuizFiltersStore.getState()
expect(state.categoryId).toBe('cat-123')
expect(state.sort).toBe('newest')
  })
})

describe('useQuizFiltersStore — reset', () => {
it('resetFilters() clears all fields', () => {
setFilter('sort', 'popular')
setFilter('difficulty', 'easy')
setFilter('tagSlugs', ['a', 'b'])

resetFilters()

const state = useQuizFiltersStore.getState()
expect(state.sort).toBeUndefined()
expect(state.difficulty).toBeUndefined()
expect(state.tagSlugs).toBeUndefined()
expect(state.categoryId).toBeUndefined()
  })
})

describe('useQuizFiltersStore — getUrlSearchParams', () => {
it('returns the serialised state', () => {
setFilter('sort', 'popular')
setFilter('difficulty', 'easy')
const params = getUrlSearchParams()
expect(params.get('sort')).toBe('popular')
expect(params.get('difficulty')).toBe('easy')
  })

it('returns an empty URLSearchParams for an empty state', () => {
const params = getUrlSearchParams()
expect(params.toString()).toBe('')
  })

it('serialises tagSlugs as comma-separated values', () => {
setFilter('tagSlugs', ['a', 'b', 'c'])
const params = getUrlSearchParams()
expect(params.get('tags')).toBe('a,b,c')
  })
})

describe('useQuizFiltersStore — setFromUrlSearchParams', () => {
it('parses URL params into the state', () => {
const params = new URLSearchParams('sort=popular&difficulty=easy')
setFromUrlSearchParams(params)
const state = useQuizFiltersStore.getState()
expect(state.sort).toBe('popular')
expect(state.difficulty).toBe('easy')
  })

it('parses comma-separated tagSlugs', () => {
const params = new URLSearchParams('tags=a,b,c')
setFromUrlSearchParams(params)
expect(useQuizFiltersStore.getState().tagSlugs).toEqual(['a', 'b', 'c'])
  })
})

describe('useQuizFiltersStore — round-trip identity', () => {
it('setFromUrlSearchParams(getUrlSearchParams()) is the identity', () => {

setFilter('categoryId', 'cat-123')
setFilter('sort', 'popular')
setFilter('difficulty', 'easy')
setFilter('tagSlugs', ['a', 'b'])

const params = getUrlSearchParams()
resetFilters()
setFromUrlSearchParams(params)

const state = useQuizFiltersStore.getState()
expect(state.categoryId).toBe('cat-123')
expect(state.sort).toBe('popular')
expect(state.difficulty).toBe('easy')
expect(state.tagSlugs).toEqual(['a', 'b'])
  })
})
