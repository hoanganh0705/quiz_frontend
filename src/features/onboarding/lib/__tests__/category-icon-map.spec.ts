import { describe, expect, it } from 'vitest'

import {
  FALLBACK_ICON,
  getCategoryIcon,
  SLUG_TO_ICON,
} from '@/features/onboarding/lib/category-icon-map'

describe('category-icon-map', () => {
  describe('getCategoryIcon', () => {
    it('(1) returns the mapped emoji for a known slug', () => {
      expect(getCategoryIcon('science')).toBe('🔬')
      expect(getCategoryIcon('history')).toBe('🏛️')
      expect(getCategoryIcon('music')).toBe('🎵')
    })

    it('(2) falls back to the leading token when the full slug is unmapped', () => {
      // `technology-ai` is not in the map, but `technology` is.
      expect(getCategoryIcon('technology-ai')).toBe('💻')
    })

    it('(3) returns the fallback emoji for unknown slugs', () => {
      expect(getCategoryIcon('totally-unknown-slug')).toBe(FALLBACK_ICON)
      expect(FALLBACK_ICON).toBe('📚')
    })

    it('(4) handles empty-string slug safely', () => {
      expect(getCategoryIcon('')).toBe(FALLBACK_ICON)
    })

    it('(5) SLUG_TO_ICON is frozen (defensive — exported as Readonly)', () => {
      expect(Object.isFrozen(SLUG_TO_ICON)).toBe(true)
    })
  })
})
