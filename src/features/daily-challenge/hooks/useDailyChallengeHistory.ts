'use client'

/**
 * `useDailyChallengeHistory()` — paginated read of past daily-challenge
 * history.
 *
 * Source epic:   Epic 3.12 — `/daily-challenge` read-only render.
 * Source story:  `projectDocs/Epics/PHASE_3_EPICS.md` → Story 3.12.
 * Source ticket: TKT-3.12.B1.
 *
 * ## Fetcher contract
 *
 * The hook wraps `getDailyChallengeHistoryPage` (the A3 wrapper) in
 * `useCursorPaginated` (Epic 3.2) — **cursor branch first** (the Phase
 * 3 dominant pattern, 44 of 50 paginated endpoints per `EPIC_3_2_A1.md`
 * §6). If the regenerated endpoint is offset-paginated, the hook is
 * flipped to the offset branch in a follow-up commit (drift capture
 * `EPIC_3_12_A1.md` §4).
 *
 * The fetcher adapter translates the wrapper's discriminated
 * `DailyChallengeResult<T>` to the cursor primitive's `CursorPage<T>`
 * shape:
 *
 *   - `kind: 'ok'` → `{ items, nextCursor, hasNextPage, limit }` from
 *     the page's narrowed view.
 *   - `kind: 'missing-endpoint'` → `{ items: [], nextCursor: null,
 *     hasNextPage: false, limit: 0 }` (the page is empty; the
 *     composition reads `isMissingEndpoint` from the hook result and
 *     renders the placeholder).
 *   - `kind: 'error'` → the `ApiError` is re-thrown so the cursor
 *     primitive's 429 backoff / 5xx banner applies.
 *
 * ## Result shape
 *
 *   - `items: readonly DailyChallengeHistoryItemWithId[]` — the
 *     history items across all loaded pages, deduplicated by
 *     `appendUniqueById` (Epic 3.2 B1). Each item carries a synthesised
 *     `id` (the original `id` is the entry's `id` field) so the cursor
 *     primitive's `T extends { id: string }` constraint is satisfied.
 *   - `isLoading, isLoadingMore, hasMore, loadMore, error, refresh` —
 *     the standard `useCursorPaginated` surface.
 *   - `isMissingEndpoint: boolean` — true when the wrapper reports
 *     `kind: 'missing-endpoint'`. The live composition renders the
 *     placeholder for this flag.
 *   - `mutate` — exposed for a future story (Phase 5) to invalidate
 *     the cache from the auth layer.
 *   - `retryBannerVisible` — the cursor primitive's 5xx banner.
 *
 * ## Pagination mode
 *
 * Per `EPIC_3_12_A1.md` §4, the cursor branch is the Phase 3 default.
 * When the regenerated endpoint is offset-paginated, the
 * `paginationKind: 'offset'` line is the only change required.
 *
 * ## Cache identity
 *
 * The SWR key is `['daily-challenge', 'history', { limit: HISTORY_PAGE_LIMIT }]`.
 * The `paginationKind` discriminator and the per-page cursor/offset
 * are encoded in the key tuple (mirrors `useLeaderboard`'s period-keyed
 * cache).
 *
 * ## Read-only contract
 *
 * The hook is read-only by spec. It does NOT poll, auto-refresh, or
 * open a WebSocket.
 */

import { useCallback, useMemo } from 'react'

import {
  ApiError,
  useCursorPaginated,
  type CursorPage,
} from '@/lib/api'

import {
  getDailyChallengeHistoryPage,
  type DailyChallengeHistoryItemView,
} from '@/features/daily-challenge/services/daily-challenge.service'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Page size for the daily-challenge history list. 5 matches the skeleton's default row count. */
export const DAILY_CHALLENGE_HISTORY_PAGE_LIMIT = 5

/**
 * Each history item carries a synthesised `id` (alias of the DTO's
 * `id` field) so the cursor primitive's `appendUniqueById` works.
 * Downstream consumers read `id`, never a separately-named identifier.
 */
export type DailyChallengeHistoryItemWithId =
  DailyChallengeHistoryItemView & { id: string }

export interface UseDailyChallengeHistoryResult {
  items: readonly DailyChallengeHistoryItemWithId[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  loadMore: () => void
  error: ApiError | null
  isMissingEndpoint: boolean
  refresh: () => Promise<void>
  retryBannerVisible: boolean
  mutate: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDailyChallengeHistory(): UseDailyChallengeHistoryResult {
  // The fetcher is a useMemo so the hook's identity is stable across
  // renders (the cursor primitive's D4 race-handling depends on a
  // stable fetcher reference).
  const fetcher = useMemo(
    () =>
      async ({
        cursor,
      }: {
        cursor: string | null
        params: { limit: number }
        signal?: AbortSignal
      }): Promise<CursorPage<DailyChallengeHistoryItemWithId>> => {
        const result = await getDailyChallengeHistoryPage({
          ...(cursor !== null ? { cursor } : {}),
          limit: DAILY_CHALLENGE_HISTORY_PAGE_LIMIT,
        })

        if (result.kind === 'missing-endpoint') {
          return {
            items: [],
            nextCursor: null,
            hasNextPage: false,
            limit: 0,
          }
        }
        if (result.kind === 'error') {
          throw result.error
        }

        // `kind: 'ok'` — the page is the narrowed view.
        const page = result.data
        return {
          items: page.items.map((item) => Object.assign({}, item)),
          nextCursor: page.nextCursor,
          hasNextPage: page.hasNextPage,
          limit: page.limit,
        }
      },
    [],
  )

  const result = useCursorPaginated<
    DailyChallengeHistoryItemWithId,
    { limit: number }
  >({
    key: ['daily-challenge', 'history', { limit: DAILY_CHALLENGE_HISTORY_PAGE_LIMIT }],
    fetcher,
    params: { limit: DAILY_CHALLENGE_HISTORY_PAGE_LIMIT },
    paginationKind: 'cursor',
  })

  const refresh = useCallback(async (): Promise<void> => {
    await result.refresh()
  }, [result])

  const isMissingEndpoint =
    !result.isLoading && result.error === null && result.items.length === 0

  return {
    items: result.items,
    isLoading: result.isLoading,
    isLoadingMore: result.isLoadingMore,
    hasMore: result.hasMore,
    loadMore: result.loadMore,
    error: result.error,
    isMissingEndpoint,
    refresh,
    retryBannerVisible: result.retryBannerVisible ?? false,
    mutate: result.refresh,
  }
}
