/**
 * `useQuizFiltersStore` — zustand-based filter store for the global
 * `/quizzes` directory.
 *
 * Source epic: Epic 3.5 — Global quizzes list + filters.
 * Source ticket: TKT-3.5.C1.
 *
 * The store is the single source of truth for the in-memory filter
 * state. The URL sync hook (C2) is the bridge between the store and
 * the URL — the store itself never reads `window.location`.
 *
 * ## State management approach
 *
 * The store uses `zustand` (not React context) because:
 *   - The project already vendors `zustand@5.0.13` (see
 *     `quiz_frontend/package.json` line 55). Epic 3.2 and Epic 3.3
 *     document the decision as "use React Context only when you
 *     cannot use zustand" (Epic 3.2 A3 evidence).
 *   - The store needs to be read by components that are NOT
 *     descendants of the directory page (the popular strip, the
 *     trending strip, the URL sync hook). React context would
 *     require threading the provider through every call site.
 *   - Persistence is opt-in — the directory page is the only
 *     consumer of the filter state, and the URL is the source of
 *     truth on hard reload (Story 3.5 line 549). The store does
 *     NOT use `zustand/middleware/persist` (caching filter state
 *     across page loads would fight the URL contract).
 *
 * ## Design — actions outside the data state
 *
 * The store's state is the typed `QuizFilterUrlState` (the four
 * documented filter fields). The actions are exposed as standalone
 * functions, NOT as state members, because:
 *   - Zustand's `set(partial, true)` (replacement mode) replaces
 *     the entire state — including actions. Mixing actions into
 *     the data state requires defensive patterns to keep the
 *     actions alive after a reset.
 *   - Standalone actions are simpler to unit-test (the C4 spec
 *     exercises them via `useQuizFiltersStore.getState()` shape).
 *   - The store's `getState()` returns the data state only; the
 *     actions are exported as named functions for consumers.
 *
 * ## SSR safety
 *
 * `getUrlSearchParams()` and `setFromUrlSearchParams(params)` are
 * pure functions of state — they never read `window.location` or
 * `document`. The hook is therefore safe to render on the server.
 * The URL sync hook (C2) is the only place that reads/writes the
 * browser URL.
 *
 * ## Selectors (cross-story contract rule #6)
 *
 * `useUserStore` (Epic 2.5) documents the rule: NEVER return an
 * object from a selector — objects create a new reference on every
 * call, which breaks React's `getServerSnapshot` caching and causes
 * infinite loops. Consumers either subscribe to the full state
 * (`useQuizFiltersStore()`) or to a single scalar field.
 */

import { create } from 'zustand'

import type { QuizFilterUrlState } from '@/features/quizzes/types/quiz-filter-params'
import {
  parseQuizFilterUrl,
  serializeQuizFilterUrl,
} from '@/features/quizzes/types/quiz-filter-params'

type QuizFiltersData = QuizFilterUrlState

/**
 * The store's state is the typed filter data only. Actions are
 * defined separately (below) so the typed surface stays minimal.
 */
export const useQuizFiltersStore = create<QuizFiltersData>()(() => ({}))

// ─── Actions ─────────────────────────────────────────────────────────────
// Standalone action functions that read/write the store via
// `useQuizFiltersStore.getState()` / `useQuizFiltersStore.setState()`.
// They are not part of the state object so `reset()` can replace
// the data state without losing the actions.

/**
 * Update a single field. Passing `value: undefined` removes the
 * field from the state so the URL round-trip stays minimal.
 */
export function setFilter<K extends keyof QuizFilterUrlState>(
  key: K,
  value: QuizFilterUrlState[K]
): void {
  useQuizFiltersStore.setState((state) => {
    const next: QuizFilterUrlState = { ...state }
    if (value === undefined) {
      delete next[key]
    } else {
      next[key] = value
    }
    return next
  }, true)
}

/**
 * Replace the entire filter state from a `URLSearchParams`.
 * Used by the URL sync hook (C2) to seed the store from the URL
 * on mount, and to apply a `router.replace` candidate without
 * running a diff on field-by-field.
 */
export function setFromUrlSearchParams(params: URLSearchParams): void {
  useQuizFiltersStore.setState(() => parseQuizFilterUrl(params), true)
}

/**
 * Snapshot the current state as a `URLSearchParams` for the URL
 * sync hook to write via `router.replace`.
 */
export function getUrlSearchParams(): URLSearchParams {
  return serializeQuizFilterUrl(useQuizFiltersStore.getState())
}

/** Clear all filter fields. */
export function resetFilters(): void {
  useQuizFiltersStore.setState(() => ({}), true)
}

// ─── Individual scalar selectors ──────────────────────────────────────────
// Per the cross-story contract rule #6, scalar selectors are stable
// across renders; consumers that need the full state subscribe via
// `useQuizFiltersStore()` directly.

export const useQuizFiltersCategoryId = () =>
  useQuizFiltersStore((state) => state.categoryId)

export const useQuizFiltersTagSlugs = () =>
  useQuizFiltersStore((state) => state.tagSlugs)

export const useQuizFiltersSort = () =>
  useQuizFiltersStore((state) => state.sort)

export const useQuizFiltersDifficulty = () =>
  useQuizFiltersStore((state) => state.difficulty)
