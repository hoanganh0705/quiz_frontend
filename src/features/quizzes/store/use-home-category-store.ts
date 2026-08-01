/**
 * `useHomeCategoryStore` — zustand-based per-rail category state
 * store for the Story 3.7 home-page rails.
 *
 * Source epic: Story 3.7 — Featured / trending / popular rails on `/`.
 * Source ticket: TKT-3.7.B1.
 *
 * The store is the single source of truth for the in-memory per-rail
 * category state. Each rail (trending + popular) maintains an
 * INDEPENDENT `categoryId` — featured intentionally has no
 * `featuredCategoryId` field because the featured endpoint does NOT
 * accept a category filter (see TKT-3.7.A1 §4.1 and
 * `HomeRailCategory` in `types/home-rails.ts`).
 *
 * ## State management approach
 *
 * The store uses `zustand` (not React context) because:
 *   - The project already vendors `zustand@5.0.13` (see
 *     `quiz_frontend/package.json`). Epic 3.2 and Epic 3.3 establish
 *     the decision as "use React Context only when you cannot use
 *     zustand" (Epic 3.2 A3 evidence).
 *   - The store needs to be read by the rail components AND written
 *     by the inline `<HomeCategoryFilter />` (TKT-3.7.B2) — both of
 *     which may render in different subtrees on the home page.
 *     Passing the dispatch through React context would force the
 *     home page to thread a provider through the rails.
 *
 * The mirror store for the global quiz-filter state is
 * `useQuizFiltersStore` (Epic 3.5 C1) — see the file header there
 * for the cross-store rationale and the "actions outside the data
 * state" pattern. This store follows the same convention so the
 * two stores feel identical to consumers.
 *
 * ## Persistence is opt-in
 *
 * The store does NOT use `zustand/middleware/persist`. The home page
 * is a one-shot landing surface — the user's filter choice does not
 * need to survive a tab refresh, only a per-rail swap. Adding
 * persistence here would also fight no source-of-truth contract
 * (the home page does not URL-sync its per-rail category — the
 * directory page does, but Story 3.7 explicitly does NOT — see
 * Story 3.7 line 781).
 *
 * ## SSR safety
 *
 * Initialisation defaults to `{}` so server-side render produces
 * no state. The store never references browser globals — the
 * accompanying B6 test (h) asserts the file source contains no
 * browser-global identifiers as a defensive lock.
 */

import { create } from 'zustand'

import type { HomeRailCategory } from '@/features/quizzes/types/home-rails'

type HomeCategoryData = HomeRailCategory

/**
 * The store's state is the typed per-rail category data only. Actions
 * are defined separately (below) so the typed surface stays minimal
 * and `reset()` can replace the data state without losing the
 * action functions.
 */
export const useHomeCategoryStore = create<HomeCategoryData>()(() => ({}))

// ─── Actions ─────────────────────────────────────────────────────────────
// Standalone action functions that read/write the store via
// `useHomeCategoryStore.getState()` / `useHomeCategoryStore.setState()`.
// They are not part of the state object so `reset()` can replace
// the data state without losing the actions.

/**
 * Update the trending rail's category. Passing `categoryId: undefined`
 * clears the field so the rail falls back to "All categories" without
 * carrying an empty-string sentinel.
 */
export function setTrendingCategory(
  categoryId: string | undefined,
): void {
  useHomeCategoryStore.setState((state) => {
    const next: HomeCategoryData = { ...state }
    if (categoryId === undefined) {
      delete next.trendingCategoryId
    } else {
      next.trendingCategoryId = categoryId
    }
    return next
  }, true)
}

/**
 * Update the popular rail's category. Same semantics as
 * `setTrendingCategory` — `undefined` clears the field.
 */
export function setPopularCategory(
  categoryId: string | undefined,
): void {
  useHomeCategoryStore.setState((state) => {
    const next: HomeCategoryData = { ...state }
    if (categoryId === undefined) {
      delete next.popularCategoryId
    } else {
      next.popularCategoryId = categoryId
    }
    return next
  }, true)
}

/**
 * Clear both rail fields, falling back to the initial `{}` state.
 * Used by the per-rail empty-state's "Reset filter" CTA when the
 * user has narrowed a rail to a category that returns no items
 * (the rail component — TKT-3.7.C5 / TKT-3.7.C6 — owns the
 * copy).
 */
export function resetHomeCategory(): void {
  useHomeCategoryStore.setState(() => ({}), true)
}

// ─── Individual scalar selectors ──────────────────────────────────────────
// Per the cross-story contract rule #6 (see `useUserStore` in
// Epic 2.5), scalar selectors return primitives — never objects —
// so React's `getServerSnapshot` caching does not break on every
// re-render. Consumers that need the full state subscribe via
// `useHomeCategoryStore()` directly.

export const useTrendingCategoryId = () =>
  useHomeCategoryStore((state) => state.trendingCategoryId)

export const usePopularCategoryId = () =>
  useHomeCategoryStore((state) => state.popularCategoryId)
