/**
 * `quiz-filter-params.ts` — the typed filter-state shape used by
 * `<FilterBar />`, the URL sync hook (Batch C), and the directory
 * hook (B1).
 *
 * Source epic: Epic 3.5 — Global quizzes list + filters.
 * Source ticket: TKT-3.5.A3.
 *
 * The URL is the source of truth for filter state on a hard reload
 * (Story 3.5 line 595 / AC #3). The filter state is round-tripped
 * through the URL via `parseQuizFilterUrl` and `serializeQuizFilterUrl`
 * — both pure functions of state, safe to call on either the server
 * or the client.
 *
 * ## Drift notes (TKT-3.5.A1)
 *
 * - The planning doc (Story 3.5 line 522 / 575) called the tag
 *   filter `tags=slug1,slug2` (an array of slugs). The SDK accepts
 *   `tagIds: UUIDv7[]`. The `<FilterBar />` slot primitive accepts
 *   slugs from the user; the fetcher adapter (B1) resolves slugs →
 *   UUIDv7 ids. This module exposes `tagSlugs: string[]` (planning
 *   intent) — the resolution to UUIDv7 ids is a fetcher concern.
 * - The planning doc (Story 3.5 line 522 / 577) listed `sort` as a
 *   URL query parameter. The SDK does NOT accept `sort` server-side
 *   (drift #2 in A1). The URL may still carry `sort` for the
 *   "active filter" affordance; the directory applies the sort
 *   client-side on the items returned for the current page.
 * - Unknown `sort` values silently coerce to `'newest'` (Story 3.5
 *   line 577); unknown `difficulty` values silently coerce to
 *   `undefined`; unknown tag slugs are silently dropped (Story 3.5
 *   line 582).
 */

import type { QuizDifficulty } from './quiz-backend'

// ---------------------------------------------------------------------------

/**
 * The `sort` filter values documented by Story 3.5 line 522 + 577.
 * The SDK does NOT accept `sort` server-side — see drift note above.
 */
export const QUIZ_SORT_VALUES = ['newest', 'popular', 'top_rated', 'trending'] as const

export type QuizSort = (typeof QUIZ_SORT_VALUES)[number]

/**
 * Re-export `QuizDifficulty` (defined in `./quiz-backend`) for
 * consumers of the filter-params module who don't want to reach into
 * `quiz-backend` directly.
 */
export type { QuizDifficulty }

/**
 * The `difficulty` filter UI affordance includes an "All levels"
 * option. When the filter value is `undefined` (the URL omits the
 * param), the directory treats it as "all".
 */
export type QuizDifficultyFilter = QuizDifficulty | 'all' | undefined

/**
 * The typed shape that round-trips through the URL.
 *
 * - `categoryId?: string` — single UUIDv7 (Story 3.5 line 576)
 * - `tagSlugs?: string[]` — array of tag slugs (Story 3.5 line 575)
 * - `sort?: QuizSort` — client-side sort (Story 3.5 line 577)
 * - `difficulty?: QuizDifficulty | 'all'` — `undefined` is the same
 *   as `'all'` (no filter applied)
 */
export interface QuizFilterUrlState {
  categoryId?: string
  tagSlugs?: string[]
  sort?: QuizSort
  difficulty?: QuizDifficulty | 'all'
}

// ---------------------------------------------------------------------------
// Tag slug regex — mirrors the tag-slug regex from Epic 3.4 (A3) so
// unknown / malformed slugs are silently dropped during URL parse.
// ---------------------------------------------------------------------------

/**
 * Lowercase letters, digits, and dashes only; no leading/trailing dash;
 * no consecutive dashes. Mirrors the server-side tag-slug validation
 * regex from Epic 3.4 (`TAG_SLUG_REGEX`).
 */
export const TAG_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isValidTagSlug(value: string): boolean {
  return TAG_SLUG_REGEX.test(value)
}

// ---------------------------------------------------------------------------
// Parse + serialize helpers
// ---------------------------------------------------------------------------

const isQuizSort = (value: string): value is QuizSort =>
  (QUIZ_SORT_VALUES as readonly string[]).includes(value)

const isQuizDifficulty = (
  value: string,
): value is QuizDifficulty =>
  value === 'easy' || value === 'medium' || value === 'hard'

/**
 * Parse a `URLSearchParams` into a `QuizFilterUrlState`.
 *
 * Coercion policy (per A3 AC #4):
 *
 * - Unknown `sort` values silently coerce to `'newest'`
 *   (Story 3.5 line 577). If the user types `?sort=foo`, the state
 *   is `{ sort: 'newest' }` and the URL round-trip stays clean.
 * - Unknown `difficulty` values silently coerce to `undefined`
 *   (no filter applied).
 * - Unknown / malformed tag slugs (e.g. `"Hello World"`) are
 *   silently dropped from `tagSlugs` (Story 3.5 line 582).
 *
 * Empty fields are omitted from the returned state so the round-trip
 * stays minimal.
 */
export function parseQuizFilterUrl(
  searchParams: URLSearchParams,
): QuizFilterUrlState {
  const state: QuizFilterUrlState = {}

  const categoryId = searchParams.get('categoryId')
  if (categoryId !== null && categoryId !== '') {
    state.categoryId = categoryId
  }

  const tagSlugsRaw = searchParams.get('tags')
  if (tagSlugsRaw !== null && tagSlugsRaw !== '') {
    const tagSlugs = tagSlugsRaw
      .split(',')
      .map((slug) => slug.trim())
      .filter((slug) => slug.length > 0 && isValidTagSlug(slug))
    if (tagSlugs.length > 0) {
      state.tagSlugs = tagSlugs
    }
  }

  const sortRaw = searchParams.get('sort')
  if (sortRaw !== null && sortRaw !== '') {
    state.sort = isQuizSort(sortRaw) ? sortRaw : 'newest'
  }

  const difficultyRaw = searchParams.get('difficulty')
  if (difficultyRaw !== null && difficultyRaw !== '') {
    if (isQuizDifficulty(difficultyRaw)) {
      state.difficulty = difficultyRaw
    } else if (difficultyRaw === 'all') {
      state.difficulty = 'all'
    } else {
      // Unknown difficulty — silently drop (Story 3.5 line 577).
      state.difficulty = undefined
    }
  }

  return state
}

/**
 * Serialize a `QuizFilterUrlState` to a `URLSearchParams`.
 *
 * Default fields are omitted (the URL stays minimal). The key names
 * are `categoryId`, `tags` (comma-separated slugs), `sort`,
 * `difficulty`.
 */
export function serializeQuizFilterUrl(
  state: QuizFilterUrlState,
): URLSearchParams {
  const params = new URLSearchParams()

  if (state.categoryId !== undefined && state.categoryId !== '') {
    params.set('categoryId', state.categoryId)
  }

  if (state.tagSlugs !== undefined && state.tagSlugs.length > 0) {
    // Filter out invalid slugs again as a defence-in-depth — the URL
    // is the source of truth, but a future caller may construct a
    // state with unvalidated slugs.
    const validSlugs = state.tagSlugs.filter(isValidTagSlug)
    if (validSlugs.length > 0) {
      params.set('tags', validSlugs.join(','))
    }
  }

  if (state.sort !== undefined) {
    params.set('sort', state.sort)
  }

  if (state.difficulty !== undefined) {
    params.set('difficulty', state.difficulty)
  }

  return params
}