/**
 * `attempt-history.types.ts` — Story 4.15 attempt-history filter and
 * cache-key types.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.3.
 *
 * ## Purpose
 *
 * Single source of truth for the URL-syncable filter shape, the
 * cursor-pagination result shape, and the cache-key factory the
 * `useMyAttemptsWithFilters` (T-4.15.13) and
 * `useAttemptHistoryFilters` (T-4.15.14) hooks share.
 *
 * ## Status filter values
 *
 * The deployed `GET /attempts/me` status filter accepts the same
 * canonical attempt-lifecycle status union as the runner state machine:
 *
 *   - `'started'`     — the attempt is currently in progress.
 *   - `'completed'`   — the attempt is terminal and scored.
 *   - `'abandoned'`   — the attempt is terminal and not scored.
 *
 * `AttemptHistoryStatusFilter` extends the union with `'all'` so the
 * history page's filter UI can offer an "all statuses" option without
 * round-tripping the SDK filter.
 *
 * ## Date-range filter
 *
 * The history page supports a small, fixed set of preset date ranges
 * (`'all'`, `'last_7_days'`, `'last_30_days'`, `'last_90_days'`).
 * Custom date ranges are out of scope for Phase 4 — the filter is
 * locked to presets to keep the URL state predictable.
 *
 * ## Player-DTO invariant (Story 4.10)
 *
 * `AttemptHistoryRow` extends the verified generated
 * `AttemptSummaryResponseDto` and synthesises an `id` alias for the
 * `useCursorPaginated` deduplication helper. No field is redefined
 * field-for-field.
 */

import type { AttemptSummaryResponseDto } from '@/lib/api/generated/schemas';

// ─── Status filter ────────────────────────────────────────────────────────

/**
 * Status filter union for the history list.
 *
 * Extends the canonical attempt-lifecycle status union with the
 * `'all'` sentinel the filter UI offers. The hook translates `'all'`
 * to "no filter" before forwarding to the SDK.
 */
export type AttemptHistoryStatusFilter =
  | 'all'
  | 'started'
  | 'completed'
  | 'abandoned';

/**
 * Preset date-range filter for the history list.
 *
 * The history page locks this to a small fixed set so the URL state
 * stays predictable and shareable. The hook translates the preset
 * into an explicit `finishedAt` range before forwarding to the SDK
 * (when the deployed filter supports it; otherwise the preset is
 * client-applied).
 */
export type AttemptHistoryDateRange =
  | 'all'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days';

// ─── Filters ──────────────────────────────────────────────────────────────

/**
 * URL-syncable filter state for the history page.
 *
 * The shape is intentionally flat so the
 * `useAttemptHistoryFilters` (T-4.15.14) hook can serialize it to
 * URL search params one field at a time. The `cursor` field is
 * preserved through filter changes so back/forward navigation lands
 * on the same page.
 */
export interface AttemptHistoryFilters {
  /** Status filter. `'all'` means no status filter. */
  status: AttemptHistoryStatusFilter;
  /** Date-range preset. `'all'` means no date-range filter. */
  dateRange: AttemptHistoryDateRange;
  /** Free-text quiz search; empty string means no search filter. */
  search: string;
  /** Opaque pagination cursor. `null` means "first page". */
  cursor: string | null;
  /** Optional per-page limit. The hook defaults to a Phase-3 value. */
  limit?: number;
}

/**
 * Default filter state for the history page.
 *
 * Centralised here so the URL-sync hook, the page, and the URL
 * initializer agree on the empty filter shape.
 */
export const DEFAULT_ATTEMPT_HISTORY_FILTERS: AttemptHistoryFilters = {
  status: 'all',
  dateRange: 'all',
  search: '',
  cursor: null,
};

// ─── Page shape ───────────────────────────────────────────────────────────

/**
 * Cursor-pagination result shape for the history list.
 *
 * `items` is the deduped list of `AttemptHistoryRow`; `nextCursor`
 * is the opaque cursor the SDK returned; `hasNextPage` follows the
 * pagination metadata; `limit` is the resolved page size.
 */
export interface AttemptHistoryPage {
  items: readonly AttemptHistoryRow[];
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
}

/**
 * Attempt summary with a synthesised `id` alias.
 *
 * The `id` field is an alias of `attemptId` so
 * `appendUniqueById` deduplication in `useCursorPaginated` works.
 * The shape extends — not redefines — the verified generated DTO.
 */
export type AttemptHistoryRow = AttemptSummaryResponseDto & {
  id: string;
};

// ─── Serialisation ────────────────────────────────────────────────────────

/**
 * Serialize the filters to a stable, URL-safe key fragment.
 *
 * Pure function used by `ATTEMPT_HISTORY_CACHE_KEYS` and the
 * URL-sync hook. Two equal filter objects produce equal strings;
 * field order is fixed so the cache key never depends on object
 * insertion order.
 */
export function serializeAttemptHistoryFilters(
  filters: AttemptHistoryFilters,
): string {
  const parts: string[] = [
    `status=${filters.status}`,
    `date=${filters.dateRange}`,
    `q=${filters.search.trim().toLowerCase()}`,
  ];
  if (filters.cursor !== null) {
    parts.push(`cursor=${filters.cursor}`);
  }
  if (typeof filters.limit === 'number') {
    parts.push(`limit=${filters.limit}`);
  }
  return parts.join('|');
}

// ─── SWR cache keys ──────────────────────────────────────────────────────

/**
 * SWR cache keys for the Story 4.15 history reads.
 *
 * Each factory returns a frozen tuple so equal inputs produce equal
 * keys. The factories are pure (no clock, no random) so they are
 * safe to call inside `useMemo` and `useEffect` dependency arrays.
 */
export const ATTEMPT_HISTORY_CACHE_KEYS = {
  /**
   * SWR key for the cursor-paginated history list
   * (`useMyAttemptsWithFilters`).
   *
   * Scoped by the authenticated user and the serialised filter
   * shape so different filter combinations do not collide and a
   * single mutate call can target every page of a given filter.
   */
  list(sessionId: string, filters: AttemptHistoryFilters) {
    return [
      'attempts',
      'history',
      sessionId,
      serializeAttemptHistoryFilters(filters),
    ] as const;
  },

  /**
   * SWR key for the full history list (no filter applied).
   *
   * Used by the cross-tab reconciliation adapter to invalidate
   * every paginated page after a completion event arrives.
   * `mutate((key) => key[0] === 'attempts' && key[1] === 'history', …)`
   * is the documented invalidation pattern.
   */
  all(sessionId: string) {
    return ['attempts', 'history', sessionId, '*'] as const;
  },
} as const;