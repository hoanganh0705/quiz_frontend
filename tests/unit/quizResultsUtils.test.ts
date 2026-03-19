import { describe, expect, it } from 'vitest'
import {
  calculateAvgTime,
  calculatePercentile,
  getScoreGrade,
  getScoreColor,
  getStorageKey,
} from '@/lib/quizResultsUtils'

describe('quizResultsUtils', () => {
  it('builds storage key with quiz id', () => {
    expect(getStorageKey('quiz-1')).toBe('quiz_progress_quiz-1')
  })

  it('returns grade based on score thresholds', () => {
    expect(getScoreGrade(95)).toBe('A+')
    expect(getScoreGrade(75)).toBe('B')
    expect(getScoreGrade(45)).toBe('F')
  })

  it('returns score color by threshold', () => {
    expect(getScoreColor(85)).toBe('text-green-500')
    expect(getScoreColor(65)).toBe('text-yellow-500')
    expect(getScoreColor(20)).toBe('text-red-500')
  })

  it('calculates average time safely', () => {
    expect(calculateAvgTime({ 0: 10, 1: 20, 2: 30 })).toBe(20)
    expect(calculateAvgTime({})).toBe(0)
  })

  it('keeps percentile in 1..99 range', () => {
    expect(calculatePercentile(0)).toBeGreaterThanOrEqual(1)
    expect(calculatePercentile(100)).toBeLessThanOrEqual(99)
  })
})
