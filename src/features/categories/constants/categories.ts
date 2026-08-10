/**
 * `features/categories/constants/categories.ts` — category metadata
 * used by onboarding's interest-selection step.
 *
 * Source epic:   Phase 8 production-readiness hardening.
 * Source ticket: PROD-A2 — restore missing onboarding constant.
 *
 * The categories shipped here are a static fallback list aligned
 * with the platform's documented category taxonomy. Production
 * category data is fetched live via `listCategories`; this constant
 * exists only so the onboarding flow has a stable, type-checked
 * list of selectable interest IDs.
 */

export interface OnboardingCategory {
  /** Stable id used as the interest value. */
  id: string
  /** User-facing display name. */
  name: string
  /** Emoji glyph rendered in the selection card. */
  icon: string
  /** Display count, shown as a hint next to the label. */
  count: number
}

/**
 * Sentinel id excluded from the selectable list (rendered as the
 * "All categories" filter elsewhere).
 */
export const ALL_CATEGORIES_ID = 'all-categories'

export const categories: readonly OnboardingCategory[] = [
  { id: 'general-knowledge', name: 'General Knowledge', icon: '🧠', count: 142 },
  { id: 'science', name: 'Science', icon: '🔬', count: 87 },
  { id: 'history', name: 'History', icon: '🏛️', count: 64 },
  { id: 'geography', name: 'Geography', icon: '🌍', count: 53 },
  { id: 'literature', name: 'Literature', icon: '📚', count: 41 },
  { id: 'mathematics', name: 'Mathematics', icon: '➗', count: 39 },
  { id: 'music', name: 'Music', icon: '🎵', count: 35 },
  { id: 'movies', name: 'Movies & TV', icon: '🎬', count: 78 },
  { id: 'sports', name: 'Sports', icon: '⚽', count: 56 },
  { id: 'technology', name: 'Technology', icon: '💻', count: 49 },
  { id: 'food', name: 'Food & Drink', icon: '🍔', count: 27 },
  { id: 'animals', name: 'Animals', icon: '🐾', count: 31 },
  { id: 'art', name: 'Art & Design', icon: '🎨', count: 24 },
  { id: 'language', name: 'Languages', icon: '🗣️', count: 19 },
  { id: 'video-games', name: 'Video Games', icon: '🎮', count: 62 },
  { id: 'anime', name: 'Anime & Manga', icon: '🌸', count: 33 },
  { id: 'politics', name: 'Politics', icon: '🏛️', count: 18 },
  { id: 'mythology', name: 'Mythology', icon: '⚡', count: 22 },
  { id: 'space', name: 'Space & Astronomy', icon: '🚀', count: 29 },
  { id: 'business', name: 'Business & Finance', icon: '💼', count: 25 },
]