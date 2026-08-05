"use client";

/**
 * `useDebouncedValue` — debounce primitive for the search surface.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.6 — Search and Approved Read-Only Social Discovery Integration.
 * Source ticket: TKT-5.6.B1.
 *
 * ## What this hook owns
 *
 * - Re-export the generic `useDebouncedValue` from `@/lib/utils`
 *   (introduced in TKT-3.3.E1) so consumers in the search feature
 *   import it from a single, stable path.
 * - Define the canonical `DEFAULT_SEARCH_DEBOUNCE_MS` value used by
 *   every search input and the `useSearch` hook.
 *
 * ## Behaviour contract
 *
 * - Returns the most recent `value` only after `delayMs` has elapsed
 *   since the last change.
 * - Cancels the pending timer when the value changes again before
 *   `delayMs`.
 * - Cancels the pending timer on unmount.
 * - Preserves referential identity when the input value is unchanged.
 *
 * ## SSR
 *
 * The hook is a no-op on the server (the first render returns the
 * initial value). The `setTimeout`-based update is client-only.
 *
 * ## Why this is a re-export
 *
 * Phase 3 (TKT-3.3.E1) already shipped a generic `useDebouncedValue`
 * at `@/lib/utils/use-debounced-value`. Phase 5 (Story 5.6) consumes
 * that hook through the search barrel instead of introducing a
 * duplicate implementation. The canonical debounce delay for search
 * is 250 ms — fast enough to feel responsive on every keystroke, slow
 * enough to coalesce a burst of input changes into a single fetch.
 */

export { useDebouncedValue } from "@/lib/utils/use-debounced-value";

/**
 * Default debounce delay (milliseconds) for the search surface.
 *
 * Used by `useSearch` (TKT-5.6.B2), `SearchInput` (TKT-5.6.D1), and
 * `useSearchUrlState` (TKT-5.6.B4) when the caller does not pass an
 * explicit delay. Aligns with the Phase 3 category browse debounce.
 */
export const DEFAULT_SEARCH_DEBOUNCE_MS = 250;

/**
 * Default search-input debounce delay (alias).
 *
 * Exposed for components that import the constant under a domain
 * name; the underlying value matches `DEFAULT_SEARCH_DEBOUNCE_MS`.
 */
export const SEARCH_INPUT_DEBOUNCE_MS = DEFAULT_SEARCH_DEBOUNCE_MS;