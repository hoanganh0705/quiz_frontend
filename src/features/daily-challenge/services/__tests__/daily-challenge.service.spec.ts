import { describe, expect, it } from 'vitest'

import { toCategoryBreakdownItems } from '@/features/daily-challenge/services/daily-challenge.service'
import type { DailyChallengeCategoryBreakdownResponseDto } from '@/lib/api/generated/schemas/dailyChallengeCategoryBreakdownResponseDto'

function makeDtoItem(
  overrides: Partial<NonNullable<DailyChallengeCategoryBreakdownResponseDto['items'][number]>> = {},
): NonNullable<DailyChallengeCategoryBreakdownResponseDto['items'][number]> {
  return {
    categoryId: 'cat-1',
    categoryName: 'Science',
    categorySlug: 'science',
    attemptCount: 3,
    averageScorePercent: 78.5,
    ...overrides,
  }
}

describe('toCategoryBreakdownItems', () => {
  it('(1) returns an empty array when the payload is undefined', () => {
    expect(toCategoryBreakdownItems(undefined)).toEqual([])
  })

  it('(2) returns an empty array when the payload is an empty array', () => {
    expect(toCategoryBreakdownItems([])).toEqual([])
  })

  it('(3) round-trips well-formed DTO items into the view shape', () => {
    const items: DailyChallengeCategoryBreakdownResponseDto['items'] = [
      makeDtoItem({ categoryId: 'c1', categoryName: 'Science', categorySlug: 'science', attemptCount: 5, averageScorePercent: 80 }),
      makeDtoItem({ categoryId: 'c2', categoryName: 'History', categorySlug: 'history', attemptCount: 3, averageScorePercent: 60.5 }),
    ]
    const result = toCategoryBreakdownItems(items)
    expect(result).toEqual([
      {
        categoryId: 'c1',
        categoryName: 'Science',
        categorySlug: 'science',
        attemptCount: 5,
        averageScorePercent: 80,
      },
      {
        categoryId: 'c2',
        categoryName: 'History',
        categorySlug: 'history',
        attemptCount: 3,
        averageScorePercent: 60.5,
      },
    ])
  })

  it('(4) coerces numeric string fields (defensive — Drizzle numeric columns serialise as strings)', () => {
    const items: DailyChallengeCategoryBreakdownResponseDto['items'] = [
      // The Orval DTO types these as `number`, but the real network
      // payload could still send strings. We coerce gracefully.
      makeDtoItem({ categoryId: 'c1', attemptCount: '5' as unknown as number, averageScorePercent: '80' as unknown as number }),
    ]
    const result = toCategoryBreakdownItems(items)
    expect(result[0]?.attemptCount).toBe(5)
    expect(result[0]?.averageScorePercent).toBe(80)
  })

  it('(5) filters out null / undefined entries defensively', () => {
    const items: DailyChallengeCategoryBreakdownResponseDto['items'] = [
      makeDtoItem({ categoryId: 'c1' }),
      // null / undefined entries could appear in a malformed payload.
      null as unknown as NonNullable<DailyChallengeCategoryBreakdownResponseDto['items'][number]>,
      undefined as unknown as NonNullable<DailyChallengeCategoryBreakdownResponseDto['items'][number]>,
      makeDtoItem({ categoryId: 'c2', categoryName: 'History', categorySlug: 'history' }),
    ]
    const result = toCategoryBreakdownItems(items)
    expect(result).toHaveLength(2)
    expect(result.map((i) => i.categoryId)).toEqual(['c1', 'c2'])
  })

  it('(6) defaults categoryName / categorySlug to empty string when null', () => {
    const items: DailyChallengeCategoryBreakdownResponseDto['items'] = [
      makeDtoItem({
        categoryId: 'c1',
        categoryName: null as unknown as string,
        categorySlug: null as unknown as string,
      }),
    ]
    const result = toCategoryBreakdownItems(items)
    expect(result[0]?.categoryName).toBe('')
    expect(result[0]?.categorySlug).toBe('')
  })

  it('(7) preserves the server-side ordering (attempt_count DESC, avg DESC)', () => {
    const items: DailyChallengeCategoryBreakdownResponseDto['items'] = [
      makeDtoItem({ categoryId: 'c1', attemptCount: 5, averageScorePercent: 50 }),
      makeDtoItem({ categoryId: 'c2', attemptCount: 5, averageScorePercent: 90 }),
      makeDtoItem({ categoryId: 'c3', attemptCount: 2, averageScorePercent: 100 }),
    ]
    const result = toCategoryBreakdownItems(items)
    // The mapping is structural — order comes from the SQL ORDER BY.
    expect(result.map((i) => i.categoryId)).toEqual(['c1', 'c2', 'c3'])
  })
})
