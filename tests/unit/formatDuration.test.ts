import { describe, expect, it } from 'vitest'
import { formatDuration } from '@/lib/formatDuration'

describe('formatDuration', () => {
  it('formats minutes below one hour', () => {
    expect(formatDuration(45)).toBe('45 minutes')
  })

  it('formats exact hours', () => {
    expect(formatDuration(120)).toBe('2 hours')
  })

  it('formats hours and minutes', () => {
    expect(formatDuration(61)).toBe('1 hour 1 minute')
  })

  it('returns invalid for negative values', () => {
    expect(formatDuration(-1)).toBe('Invalid duration')
  })
})
