

import { describe, expect, it } from 'vitest'

import {
FEATURED_RAIL_LIMIT,
POPULAR_RAIL_LIMIT,
TRENDING_RAIL_LIMIT,
type HomeRailCategory,
} from '@/features/quizzes/types/home-rails'

describe('HomeRailCategory — shape', () => {
it("(a) accepts an empty object", () => {
const state: HomeRailCategory = {}
expect(state).toEqual({})
expect(state.trendingCategoryId).toBeUndefined()
expect(state.popularCategoryId).toBeUndefined()
  })

it("(b) accepts a fully populated object with only trendingCategoryId", () => {
const state: HomeRailCategory = { trendingCategoryId: 'abc' }
expect(state.trendingCategoryId).toBe('abc')
expect(state.popularCategoryId).toBeUndefined()
  })

it("(c) accepts a fully populated object with only popularCategoryId", () => {
const state: HomeRailCategory = { popularCategoryId: 'abc' }
expect(state.popularCategoryId).toBe('abc')
expect(state.trendingCategoryId).toBeUndefined()
  })

it("(d) accepts both fields populated simultaneously", () => {
const state: HomeRailCategory = {
trendingCategoryId: 'abc',
popularCategoryId: 'def',
    }
expect(state.trendingCategoryId).toBe('abc')
expect(state.popularCategoryId).toBe('def')
  })
})

describe('Rail-limit constants', () => {
it('(e) FEATURED_RAIL_LIMIT === 6', () => {
expect(FEATURED_RAIL_LIMIT).toBe(6)
  })

it('(f) TRENDING_RAIL_LIMIT === 10', () => {
expect(TRENDING_RAIL_LIMIT).toBe(10)
  })

it('(g) POPULAR_RAIL_LIMIT === 10', () => {
expect(POPULAR_RAIL_LIMIT).toBe(10)
  })
})

describe('HomeRailCategory — negative lock on featuredCategoryId', () => {
it('(h) does NOT accept a featuredCategoryId field', () => {

const state: HomeRailCategory = {
trendingCategoryId: 'abc',

featuredCategoryId: 'xyz',
    }
expect(state.trendingCategoryId).toBe('abc')
  })
})
