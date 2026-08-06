/**
 * `discovery-invariants.ts` — Cross-batch invariants for the
 * social discovery and user-search endpoints.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.A3.
 *
 * ## Purpose
 *
 * Single source of truth for the numeric invariants every
 * Story 6.5 hook and component must obey. Importing this module
 * from the debounce hook (`useDebouncedValue`), the search hooks
 * (`useUserSearch`, `useSearchSuggestions`), the search primitives
 * (`SocialSearchInput`, `UserSearchResultWindow`), and the discovery
 * pages is the canonical way to assert compliance without
 * sprinkling magic numbers across the surface.
 *
 * ## What this file owns
 *
 *   1. **Debounce window.** The default debounce window for the
 *      search / search-suggestions hooks, and the clamp boundaries.
 *      The N+1 hammering risk (Phase 6 Risks line 67) is defended
 *      by a minimum window of 150ms and a maximum of 600ms.
 *
 *   2. **Query length bounds.** The minimum and maximum query length
 *      enforced on the client before a request is dispatched. The
 *      backend enforces the same bounds; the client-side enforcement
 *      avoids obvious hammering and maps to the "query too short"
 *      empty state.
 *
 *   3. **Virtualization threshold.** The count of items at which the
 *      `UserSearchResultWindow` applies windowed virtualization. Below
 *      the threshold the list renders as plain rows; at or above the
 *      threshold IntersectionObserver drives the visible window.
 *
 *   4. **Page sizes.** The default page sizes for the three paginated
 *      discovery endpoints (suggestions, user-search, trending). These
 *      are the documented backend defaults; the `useCursorPaginated`
 *      primitive clamps any caller-supplied `limit` to these values.
 *
 *   5. **Clamp helpers.** `clampDebounceWindow` and `isQueryLengthValid`
 *      are the only public functions. No other module is permitted to
 *      re-implement the clamp or the length check.
 *
 *   6. **Frozen catalogue.** `DISCOVERY_INVARIANTS` exposes every
 *      constant as a single object so call-sites can iterate without
 *      naming each constant.
 *
 * ## What this file does NOT own
 *
 *   - The `useDebouncedValue` hook — that lives in
 *     `features/social/hooks/useDebouncedValue.ts` (TKT-6.5.B1).
 *   - The `useUserSearch` hook — that lives in
 *     `features/social/hooks/useUserSearch.ts` (TKT-6.5.D2).
 *   - The `UserSearchResultWindow` component — that lives in
 *     `features/social/components/UserSearchResultWindow.tsx` (TKT-6.5.F2).
 *
 * ## SSR-safety
 *
 * The module declares constants and pure helpers only. It reads no
 * `window`, `localStorage`, or other browser-only API. It is safe
 * to import from Server Components and from the App Router's route
 * modules.
 *
 * ## Source-of-truth update procedure
 *
 * The numeric constants are documented in the backend verification
 * report shipped with `EPIC_6_5_A1.md` (the Story 6.5 A1 evidence
 * file). If the backend team reports different bounds, this is the
 * single point of update — the type system enforces that the constant
 * is consumed by every hook and component via the helper functions,
 * so a value change here propagates without touching every call-site.
 */

// ─── Debounce window ──────────────────────────────────────────────────────

/**
 * The default debounce window (in milliseconds) for the social
 * user-search and search-suggestions hooks.
 *
 * Mirrors the documented backend rate-limit cooldown. A 300ms window
 * balances responsiveness against N+1 hammering risk (Phase 6 Risks
 * line 67). Every debouncing consumer calls `useDebouncedValue` with
 * this value as the default.
 */
export const DEBOUNCE_WINDOW_MS = 300 as const;

/**
 * The minimum debounce window (in milliseconds). The clamp prevents
 * a future caller from requesting a window that is too short for
 * the N+1 defence.
 */
export const DEBOUNCE_WINDOW_MIN_MS = 150 as const;

/**
 * The maximum debounce window (in milliseconds). The clamp prevents
 * a future caller from requesting a window that degrades the search
 * UX too much.
 */
export const DEBOUNCE_WINDOW_MAX_MS = 600 as const;

// ─── Query length bounds ───────────────────────────────────────────────────

/**
 * The minimum query length (in characters) enforced on the client
 * before a search request is dispatched.
 *
 * Mirrors the documented backend minimum. The hook renders the
 * "query too short" empty state without dispatching a request
 * when the trimmed query is shorter than this value.
 */
export const SEARCH_MIN_QUERY_LENGTH = 2 as const;

/**
 * The maximum query length (in characters) enforced on the client
 * before a search request is dispatched.
 *
 * Mirrors the documented backend maximum. The hook renders the
 * "no results" empty state without dispatching a request when
 * the trimmed query exceeds this value.
 */
export const SEARCH_MAX_QUERY_LENGTH = 64 as const;

// ─── Virtualization threshold ──────────────────────────────────────────────

/**
 * The number of items at which `UserSearchResultWindow` applies
 * IntersectionObserver-driven windowed virtualization.
 *
 * Below this threshold the list renders as plain rows; at or
 * above this threshold the windowed renderer takes over. The
 * threshold balances the memory cost of rendering many DOM nodes
 * against the overhead of the virtualization setup.
 */
export const SEARCH_VIRTUALIZATION_THRESHOLD = 40 as const;

// ─── Page sizes ────────────────────────────────────────────────────────────

/**
 * The default page size for the `/social/suggestions` endpoint.
 */
export const SUGGESTIONS_PAGE_SIZE = 10 as const;

/**
 * The default page size for the `/social/users/search` endpoint.
 */
export const SEARCH_PAGE_SIZE = 20 as const;

/**
 * The default page size for the `/social/users/trending` endpoint.
 */
export const TRENDING_PAGE_SIZE = 25 as const;

// ─── Clamp helpers ─────────────────────────────────────────────────────────

/**
 * Clamp a debounce window to the documented boundaries.
 *
 * The helper is the canonical derivation for the debounce window
 * clamp — no other module is permitted to re-implement it. The
 * contract:
 *
 *   - Returns `DEBOUNCE_WINDOW_MIN_MS` for inputs below the min.
 *   - Returns `DEBOUNCE_WINDOW_MAX_MS` for inputs above the max.
 *   - Returns the input unchanged when it is within range.
 *
 * The helper is pure (no `Date.now()`, no `Math.random()`) so it
 * is safe to call inside `useMemo` and in the spec without flake.
 *
 * @example
 *   clampDebounceWindow(100)   // 150 (below min)
 *   clampDebounceWindow(300)    // 300 (in range)
 *   clampDebounceWindow(1000)    // 600 (above max)
 */
export function clampDebounceWindow(inputMs: number): number {
  if (!Number.isFinite(inputMs)) return DEBOUNCE_WINDOW_MS;
  if (inputMs < DEBOUNCE_WINDOW_MIN_MS) return DEBOUNCE_WINDOW_MIN_MS;
  if (inputMs > DEBOUNCE_WINDOW_MAX_MS) return DEBOUNCE_WINDOW_MAX_MS;
  return inputMs;
}

/**
 * Validate that a search query falls within the documented length
 * bounds (inclusive).
 *
 * The helper is the canonical derivation for the query-length check
 * — no other module is permitted to re-implement it. The length is
 * computed on the trimmed value so leading / trailing whitespace
 * does not affect validity.
 *
 * The helper is pure so it is safe to call inside `useMemo` and
 * in the spec without flake.
 *
 * @example
 *   isQueryLengthValid("")       // false (empty)
 *   isQueryLengthValid("  ")      // false (whitespace-only after trim)
 *   isQueryLengthValid("a")        // false (below min)
 *   isQueryLengthValid("ab")      // true  (in range)
 *   isQueryLengthValid("ab cd")    // true  (in range)
 *   isQueryLengthValid("ab".repeat(100)) // false (above max)
 */
export function isQueryLengthValid(query: string): boolean {
  const trimmed = query.trim();
  if (trimmed.length < SEARCH_MIN_QUERY_LENGTH) return false;
  if (trimmed.length > SEARCH_MAX_QUERY_LENGTH) return false;
  return true;
}

// ─── Frozen catalogue ───────────────────────────────────────────────────────

/**
 * Read-only record exposing every constant in this module. Re-exported
 * from `@/features/social` so search components and admin tools can
 * read `DISCOVERY_INVARIANTS.debounceWindowMs` without needing to
 * remember the exact identifier.
 */
export const DISCOVERY_INVARIANTS = Object.freeze({
  debounceWindowMs: DEBOUNCE_WINDOW_MS,
  debounceWindowMinMs: DEBOUNCE_WINDOW_MIN_MS,
  debounceWindowMaxMs: DEBOUNCE_WINDOW_MAX_MS,
  searchMinQueryLength: SEARCH_MIN_QUERY_LENGTH,
  searchMaxQueryLength: SEARCH_MAX_QUERY_LENGTH,
  virtualizationThreshold: SEARCH_VIRTUALIZATION_THRESHOLD,
  suggestionsPageSize: SUGGESTIONS_PAGE_SIZE,
  searchPageSize: SEARCH_PAGE_SIZE,
  trendingPageSize: TRENDING_PAGE_SIZE,
});
