

import { describe, expect, it } from 'vitest'

import {
FORMATTED_QUIZ_COUNT_PLACEHOLDER,
formatQuizCount,
} from '@/features/categories/utils/format-quiz-count'

const PLACEHOLDER = FORMATTED_QUIZ_COUNT_PLACEHOLDER

describe('formatQuizCount', () => {
it('formats 0 as "0" (no grouping; F3-a)', () => {
expect(formatQuizCount(0)).toBe('0')
  })

it('formats 1234 as "1,234" in en-US (F3-b)', () => {
expect(formatQuizCount(1234)).toBe('1,234')
  })

it('formats 1_500_000 as "1.5M" (decimal short-form; F3-d)', () => {
expect(formatQuizCount(1_500_000)).toBe('1.5M')
  })

it('formats 1_500_000_000 as "1.5B" (decimal short-form, billions tier)', () => {
expect(formatQuizCount(1_500_000_000)).toBe('1.5B')
  })

it('formats null as the em-dash placeholder (F3-e)', () => {
expect(formatQuizCount(null)).toBe(PLACEHOLDER)
expect(PLACEHOLDER).toBe('—')
  })

it('formats undefined as the em-dash placeholder (F3-e)', () => {
expect(formatQuizCount(undefined)).toBe(PLACEHOLDER)
  })

it('formats NaN as the em-dash placeholder (F3-f)', () => {
expect(formatQuizCount(NaN)).toBe(PLACEHOLDER)
  })

it('formats a negative number as the em-dash placeholder (defensive)', () => {
expect(formatQuizCount(-100)).toBe(PLACEHOLDER)
  })

it('formats 1 as "1"', () => {
expect(formatQuizCount(1)).toBe('1')
  })

it('formats 999 as "999" (just below the short-form threshold)', () => {
expect(formatQuizCount(999)).toBe('999')
  })

it('formats 1_499 as "1,499" (just below the short-form threshold)', () => {
expect(formatQuizCount(1_499)).toBe('1,499')
  })

it('formats 1_500 as "1.5K" (short-form boundary matching F3-c)', () => {
expect(formatQuizCount(1_500)).toBe('1.5K')
  })

it('formats 12_345 as "12.3K" (rounded to one decimal)', () => {
expect(formatQuizCount(12_345)).toBe('12.3K')
  })

it('formats 2_500 as "2.5K" (no trailing zero)', () => {
expect(formatQuizCount(2_500)).toBe('2.5K')
  })

it('formats 3_000 as "3K" (trailing zero stripped)', () => {
expect(formatQuizCount(3_000)).toBe('3K')
  })
})
