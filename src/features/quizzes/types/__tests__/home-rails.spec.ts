/**
 * `home-rails.spec.ts` — locks the `HomeRailCategory` interface shape
 * and the three rail-limit constants.
 *
 * Source epic: Story 3.7 — Featured / trending / popular rails on `/`.
 * Source ticket: TKT-3.7.A4.
 *
 * Eight cases per the ticket:
 *
 *   (a) `HomeRailCategory` accepts an empty object (`{}`).
 *   (b) `HomeRailCategory` accepts `{ trendingCategoryId: 'abc' }` only.
 *   (c) `HomeRailCategory` accepts `{ popularCategoryId: 'abc' }` only.
 *   (d) `HomeRailCategory` accepts both fields populated.
 *   (e) `FEATURED_RAIL_LIMIT === 6`.
 *   (f) `TRENDING_RAIL_LIMIT === 10`.
 *   (g) `POPULAR_RAIL_LIMIT === 10`.
 *   (h) `HomeRailCategory` does NOT accept `featuredCategoryId`
 *       (TypeScript error at compile time — verified via
 *       `// @ts-expect-error` annotation).
 */

import { describe, expect, it } from 'vitest'

import {
  FEATURED_RAIL_LIMIT,
  POPULAR_RAIL_LIMIT,
  TRENDING_RAIL_LIMIT,
  type HomeRailCategory,
} from '@/features/quizzes/types/home-rails'

// ---------------------------------------------------------------------------
// HomeRailCategory — shape (cases a–d)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Rail-limit constants (cases e–g)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Negative lock — featuredCategoryId (case h)
// ---------------------------------------------------------------------------

describe('HomeRailCategory — negative lock on featuredCategoryId', () => {
  it('(h) does NOT accept a featuredCategoryId field', () => {
    // The `// @ts-expect-error` directive is the single canonical lock.
    // Removing the field from `HomeRailCategory` WITHOUT removing this
    // line is a test-compile-time failure (the directive would have
    // nothing to expect). Conversely, adding a `featuredCategoryId`
    // field without updating this test would be a runtime drift.
    const state: HomeRailCategory = {
      trendingCategoryId: 'abc',
      // @ts-expect-error — `HomeRailCategory` must NOT have a `featuredCategoryId` field
      featuredCategoryId: 'xyz',
    }
    expect(state.trendingCategoryId).toBe('abc')
  })
})
