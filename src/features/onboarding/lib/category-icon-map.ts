/**
 * Category-icon emoji map.
 *
 * The backend `categories` table does not carry an `icon` field (icons
 * are a presentation concern), and the `RankedCategoryResponseDto` (the
 * payload returned by `GET /categories/popular`) does not surface
 * icons. To avoid hardcoding categories on the frontend, we derive a
 * stable emoji for each category slug via this lookup.
 *
 * Design notes:
 *   - Falls back to a generic category emoji (📚) for unknown slugs so
 *     the onboarding step never renders an empty / broken cell.
 *   - The map is keyed by slug (kebab-case) — the same casing the
 *     backend emits in `RankedCategoryResponseDto.slug` and
 *     `CategoryResponseDto.slug`.
 *   - Static export so test code can assert the mapping without
 *     touching network or DOM.
 *
 * Adding a new icon:
 *   1. Add a key to `SLUG_TO_ICON` using the EXACT slug emitted by
 *      the backend's seed/foundation scripts (see
 *      `quiz_backend/src/commands/seed/...`).
 *   2. Keep the icon palette aligned with the existing hardcoded
 *      list in `features/categories/constants/categories.ts` so the
 *      onboarding step doesn't visually regress.
 */
export const SLUG_TO_ICON: Readonly<Record<string, string>> = Object.freeze({
  'general-knowledge': '🧠',
  science: '🔬',
  history: '🏛️',
  geography: '🌍',
  literature: '📚',
  mathematics: '➗',
  music: '🎵',
  movies: '🎬',
  'movies-tv': '🎬',
  sports: '⚽',
  technology: '💻',
  food: '🍔',
  'food-drink': '🍔',
  animals: '🐾',
  art: '🎨',
  'art-design': '🎨',
  language: '🗣️',
  languages: '🗣️',
  'video-games': '🎮',
  anime: '🌸',
  'anime-manga': '🌸',
  politics: '🏛️',
  mythology: '⚡',
  space: '🚀',
  'space-astronomy': '🚀',
  business: '💼',
  'business-finance': '💼',
})

const FALLBACK_ICON = '📚'

export { FALLBACK_ICON }

/**
 * Resolve the emoji icon for a category slug. Falls back to a generic
 * category icon for unknown slugs.
 */
export function getCategoryIcon(slug: string): string {
  // Direct hit.
  const direct = SLUG_TO_ICON[slug]
  if (direct !== undefined) return direct
  // Fuzzy suffix match — backend slugs are usually of the form
  // `<topic>` or `<topic>-<narrower>`. Try the leading token.
  const head = slug.split('-')[0]
  if (head !== undefined) {
    const headHit = SLUG_TO_ICON[head]
    if (headHit !== undefined) return headHit
  }
  return FALLBACK_ICON
}
