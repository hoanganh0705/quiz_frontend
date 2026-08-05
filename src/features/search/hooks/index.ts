/**
 * Search hooks — Story 5.6 barrel.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.6 — Search and Approved Read-Only Social Discovery Integration.
 *
 * Re-exports the public surface of the Story 5.6 search hooks so
 * components can import from a stable per-feature path:
 *
 *   import { useSearch } from '@/features/search/hooks'
 *
 * Mirrors the `@/features/notifications/hooks` barrel convention.
 */

// TKT-5.6.B1 — debounce primitive (re-export from Phase 3 lib utils).
export {
  useDebouncedValue,
  DEFAULT_SEARCH_DEBOUNCE_MS,
  SEARCH_INPUT_DEBOUNCE_MS,
} from './useDebouncedValue';

// TKT-5.6.B2 — primary data hook.
export { useSearch } from './useSearch'
export type {
  UseSearchResult,
} from './useSearch'

// TKT-5.6.B3 — session-scoped search history.
export { useSearchHistory } from './useSearchHistory'
export type {
  UseSearchHistoryResult,
} from './useSearchHistory'

// TKT-5.6.B4 — URL state synchronisation.
export { useSearchUrlState } from './useSearchUrlState'
export type {
  UseSearchUrlStateResult,
} from './useSearchUrlState'