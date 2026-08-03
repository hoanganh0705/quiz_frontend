'use client'

/**
 * `useLeaderboard(period)` — offset-paginated global leaderboard hook.
 *
 * Source epic:   Epic 3.11 — `/leaderboard` read-only render.
 * Source ticket: TKT-3.11.B1.
 *
 * Wraps `getLeaderboardWithPagination` (the A2 service wrapper) in the
 * `useCursorPaginated` primitive (Epic 3.2) — **offset branch** because
 * the regenerated leaderboard endpoint is offset-paginated (drift
 * capture #1 in A1). The hook narrows `LeaderboardEntryDto` to
 * `{ id: string; ...entry }` for the `useCursorPaginated` constraint
 * (the entry's `userId` becomes the `id`).
 *
 * ## Fetcher adapter — the only place `pagination` is read in this story
 *
 * Per the cross-story contract rule #7 ("the `data` and `meta` keys
 * from the success envelope never reach component state directly"),
 * the fetcher adapter is the only place `pagination.hasMore` /
 * `pagination.offset` / `pagination.limit` is read. The adapter reads
 * them exactly once per page and adapts the wire shape
 * (`{ data, meta }`) to the hook's expected offset shape
 * (`{ items, page, total, hasMore, limit }`). All other consumers of
 * this hook receive only the public `UseLeaderboardResult` shape —
 * never the wire envelope directly.
 *
 * ## Period switch resets the cursor
 *
 * The SWR key includes `period`. The cursor primitive's SWR key
 * change forces the cache to be cleared and a fresh first page to be
 * fetched (Story 3.11 line 1161: "Period selector switches the period;
 * cursor resets").
 *
 * ## `id` alias on `LeaderboardEntryDto`
 *
 * `useCursorPaginated`'s generic constraint `T extends { id: string }`
 * requires a wire item to have an `id` field. The `LeaderboardEntryDto`
 * DTO carries `userId` (not `id`), so the fetcher aliases the value
 * here — the only place this aliasing happens. Downstream consumers
 * read `userId`, never `id`.
 *
 * ## Empty / error / 404 contract
 *
 * - An empty server array is represented as `entries: []` and
 *   `hasMore: false`, not as an error.
 * - The fetcher propagates `ApiError` unchanged so the composition
 *   can map `5xx` (toast) and `404` (inline "This period isn't
 *   supported") consistently.
 *
 * ## Future mutate / cache invalidation (Phase 5)
 *
 * The hook exposes `refresh()` for cache invalidation. Phase 5 (auth
 * state changes) wires `refresh()` into the auth state change handler
 * to refresh the self-entry highlight when the user logs in or out.
 */

import { useMemo } from 'react'

import { ApiError, useCursorPaginated } from '@/lib/api'
import type { OffsetPage } from '@/lib/api/use-cursor-paginated.types'
import type { LeaderboardEntryDto } from '@/lib/api/generated/schemas'

import {
  getLeaderboardWithPagination,
  type LeaderboardPeriod,
} from '@/features/leaderboard/services/leaderboard.service'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Page size for the leaderboard directory. 20 entries matches the Story 3.11 AC #4 ("CLS = 0 with at least 20 entries rendered"). */
export const LEADERBOARD_PAGE_LIMIT = 20

/** Each entry carries a synthesised `id` (alias of `userId`) so the cursor primitive's `appendUniqueById` works. */
export type LeaderboardEntryWithId = LeaderboardEntryDto & { id: string }

/**
 * Public return type of `useLeaderboard`. Extends the cursor
 * primitive's `UseCursorPaginatedResult` with the entry-list-friendly
 * `entries` field (renamed from `items`).
 *
 * The `entries` field is the alias-renamed version of the cursor
 * primitive's `items`. The composition (Batch C) reads `entries`,
 * never `items` directly, so the wrapper concern (id-aliasing,
 * pagination) stays inside the hook.
 */
export interface UseLeaderboardResult {
  entries: readonly LeaderboardEntryWithId[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  loadMore: () => void
  error: ApiError | null
  refresh: () => Promise<void>
  retryBannerVisible: boolean
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLeaderboard(
  period: LeaderboardPeriod,
): UseLeaderboardResult {
  // The fetcher is a useMemo so the hook's identity is stable across
  // renders (Epic 3.2 D4 — race handling depends on a stable fetcher
  // reference).
  const fetcher = useMemo(
    () =>
      async ({
        page,
        params,
      }: {
        page: number
        params: { period: LeaderboardPeriod; limit: number }
        signal?: AbortSignal
      }): Promise<OffsetPage<LeaderboardEntryWithId>> => {
        // Offset pagination: `page` is 1-indexed and `offset = (page - 1) * limit`.
        const offset = (page - 1) * params.limit
        const result = await getLeaderboardWithPagination(params.period, {
          limit: params.limit,
          offset,
        })

        const data = (result as { data?: { entries?: LeaderboardEntryDto[] } }).data
        const entries = (data?.entries ?? []) as Array<LeaderboardEntryWithId>
        // Synthesise `id` alias of `userId` here — the only place
        // this aliasing happens. Downstream consumers read `userId`,
        // never `id`.
        const itemsWithId = entries.map((entry) =>
          Object.assign({}, entry, { id: entry.userId }),
        ) as Array<LeaderboardEntryWithId>

        const pagination = (result as {
          data?: { pagination?: { hasMore?: boolean; limit?: number } }
        }).data?.pagination
        return {
          items: itemsWithId,
          page,
          total: itemsWithId.length,
          hasMore: pagination?.hasMore ?? false,
          limit: pagination?.limit ?? itemsWithId.length,
        }
      },
    [],
  )

  const result = useCursorPaginated<LeaderboardEntryWithId, { period: LeaderboardPeriod; limit: number }>({
    key: ['leaderboard', period, { limit: LEADERBOARD_PAGE_LIMIT }],
    fetcher,
    params: { period, limit: LEADERBOARD_PAGE_LIMIT },
    paginationKind: 'offset',
  })

  return {
    entries: result.items,
    isLoading: result.isLoading,
    isLoadingMore: result.isLoadingMore,
    hasMore: result.hasMore,
    loadMore: result.loadMore,
    error: result.error,
    refresh: result.refresh,
    retryBannerVisible: result.retryBannerVisible ?? false,
  }
}
