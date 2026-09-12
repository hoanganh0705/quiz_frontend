import { describe, expect, it } from 'vitest'

import {
  rollupHistoryByWeekday,
  type DailyChallengePerformanceDay,
} from '@/features/daily-challenge/hooks/useDailyChallengePerformance'
import type { DailyChallengeHistoryItemWithId } from '@/features/daily-challenge/hooks/useDailyChallengeHistory'

function makeItem(
  overrides: Partial<DailyChallengeHistoryItemWithId> = {},
): DailyChallengeHistoryItemWithId {
  return {
    id: 'fixture',
    date: '2026-08-03T00:00:00.000Z', // Monday
    quizId: 'quiz-1',
    quizTitle: 'Solar System Trivia',
    slug: 'solar-system-trivia',
    difficulty: 'medium',
    category: 'medium',
    score: 80,
    rank: 1,
    isTopTen: true,
    ...overrides,
  }
}

const EMPTY: readonly DailyChallengePerformanceDay[] = [
  { day: 'Mon', yourScore: 0, avgScore: 0, hasAttempt: false, attemptCount: 0 },
  { day: 'Tue', yourScore: 0, avgScore: 0, hasAttempt: false, attemptCount: 0 },
  { day: 'Wed', yourScore: 0, avgScore: 0, hasAttempt: false, attemptCount: 0 },
  { day: 'Thu', yourScore: 0, avgScore: 0, hasAttempt: false, attemptCount: 0 },
  { day: 'Fri', yourScore: 0, avgScore: 0, hasAttempt: false, attemptCount: 0 },
  { day: 'Sat', yourScore: 0, avgScore: 0, hasAttempt: false, attemptCount: 0 },
  { day: 'Sun', yourScore: 0, avgScore: 0, hasAttempt: false, attemptCount: 0 },
]

describe('rollupHistoryByWeekday', () => {
  it('(1) returns 7 weekday buckets in Mon→Sun order with all-zero values for empty input', () => {
    const result = rollupHistoryByWeekday([])
    expect(result).toEqual(EMPTY)
    expect(result.map((d) => d.day)).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ])
  })

  it('(2) records the most recent attempt per weekday as `yourScore` (loop is newest-first)', () => {
    // History items arrive newest-first: 2026-08-10 (Mon) at index 0,
    // then 2026-08-03 (Mon) at index 1. Both Mondays. The later
    // iteration should win (last-write semantics).
    const items: DailyChallengeHistoryItemWithId[] = [
      makeItem({ id: 'older-mon', date: '2026-08-03T00:00:00.000Z', score: 70 }),
      makeItem({ id: 'newer-mon', date: '2026-08-10T00:00:00.000Z', score: 90 }),
    ]
    const result = rollupHistoryByWeekday(items)
    const mon = result.find((d) => d.day === 'Mon')!
    expect(mon.yourScore).toBe(90)
    // avgScore is the mean of both attempts.
    expect(mon.avgScore).toBe(80)
    expect(mon.attemptCount).toBe(2)
    expect(mon.hasAttempt).toBe(true)
  })

  it('(3) rounds the average to the nearest integer', () => {
    const items: DailyChallengeHistoryItemWithId[] = [
      makeItem({ date: '2026-08-10T00:00:00.000Z', score: 80 }),
      makeItem({ date: '2026-08-03T00:00:00.000Z', score: 85 }),
      makeItem({ date: '2026-07-27T00:00:00.000Z', score: 86 }),
    ]
    const result = rollupHistoryByWeekday(items)
    const mon = result.find((d) => d.day === 'Mon')!
    // (80 + 85 + 86) / 3 = 83.666... → 84
    expect(mon.avgScore).toBe(84)
  })

  it('(4) groups items by their weekday — Tue, Wed, Thu all populated, others zero', () => {
    const items: DailyChallengeHistoryItemWithId[] = [
      makeItem({ id: 'tue-1', date: '2026-08-04T00:00:00.000Z', score: 60 }), // Tue
      makeItem({ id: 'wed-1', date: '2026-08-05T00:00:00.000Z', score: 75 }), // Wed
      makeItem({ id: 'thu-1', date: '2026-08-06T00:00:00.000Z', score: 50 }), // Thu
    ]
    const result = rollupHistoryByWeekday(items)
    for (const day of ['Tue', 'Wed', 'Thu'] as const) {
      const entry = result.find((d) => d.day === day)!
      expect(entry.hasAttempt).toBe(true)
      expect(entry.attemptCount).toBe(1)
      expect(entry.yourScore).toBeGreaterThan(0)
      expect(entry.avgScore).toBeGreaterThan(0)
    }
    for (const day of ['Mon', 'Fri', 'Sat', 'Sun'] as const) {
      const entry = result.find((d) => d.day === day)!
      expect(entry.hasAttempt).toBe(false)
      expect(entry.attemptCount).toBe(0)
      expect(entry.yourScore).toBe(0)
      expect(entry.avgScore).toBe(0)
    }
  })

  it('(5) maps Sunday (getDay() === 0) into the "Sun" bucket — boundary case', () => {
    const items: DailyChallengeHistoryItemWithId[] = [
      makeItem({ date: '2026-08-02T00:00:00.000Z', score: 100 }), // Sunday
    ]
    const result = rollupHistoryByWeekday(items)
    const sun = result.find((d) => d.day === 'Sun')!
    expect(sun.hasAttempt).toBe(true)
    expect(sun.yourScore).toBe(100)
    expect(sun.avgScore).toBe(100)
    expect(sun.attemptCount).toBe(1)
  })

  it('(6) skips unparseable dates defensively without throwing', () => {
    const items: DailyChallengeHistoryItemWithId[] = [
      makeItem({ id: 'bad', date: 'not-a-date', score: 50 }),
      makeItem({ id: 'good', date: '2026-08-10T00:00:00.000Z', score: 70 }),
    ]
    const result = rollupHistoryByWeekday(items)
    const mon = result.find((d) => d.day === 'Mon')!
    // Only the parseable Monday should count.
    expect(mon.attemptCount).toBe(1)
    expect(mon.yourScore).toBe(70)
  })

  it('(7) returns a frozen-shape 7-element array even with extreme input (no off-by-one)', () => {
    const items: DailyChallengeHistoryItemWithId[] = Array.from(
      { length: 30 },
      (_, idx) =>
        makeItem({
          id: `item-${idx}`,
          date: `2026-08-${String(((idx % 28) + 1)).padStart(2, '0')}T00:00:00.000Z`,
          score: 50 + (idx % 50),
        }),
    )
    const result = rollupHistoryByWeekday(items)
    expect(result).toHaveLength(7)
    expect(result.map((d) => d.day)).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ])
    const totalAttempts = result.reduce((s, d) => s + d.attemptCount, 0)
    expect(totalAttempts).toBe(30)
  })
})
