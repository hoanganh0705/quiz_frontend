'use client'

/**
 * `useQuizzesList(query)` — cursor-paginated directory of quizzes
 * with URL-typed filter state.
 *
 * Source epic: Epic 3.5 — Global quizzes list + filters.
 * Source ticket: TKT-3.5.B1.
 *
 * Wraps `listQuizzes` (the A2 service wrapper) in the
 * `useCursorPaginated` primitive (Epic 3.2). This is the first
 * Phase-3 hook that consumes the cursor pagination primitive with
 * server-side filter+sort resolution (the tag/category hooks are
 * narrower, more focused endpoints).
 *
 * ## Fetcher adapter — the only place `nextCursor` is read in this story
 *
 * Per the cross-story contract rule #7 ("the `data` and `meta` keys
 * from the success envelope never reach component state directly"),
 * the fetcher adapter is the only place `pagination.nextCursor` is
 * allowed to be read. The adapter reads it exactly once per page and
 * adapts the wire shape (`{ data, meta }`) to the hook's expected
 * shape (`{ items, nextCursor, hasNextPage, limit }`). All other
 * consumers of this hook receive only the public
 * `UseCursorPaginatedResult` shape — never `nextCursor` or `pagination`.
 *
 * ## Slug → UUIDv7 resolution (drift #1 in A1)
 *
 * The planning doc (Story 3.5 line 522 / 575) calls the tag filter
 * `tags=slug1,slug2` (an array of slugs). The SDK accepts
 * `tagIds: UUIDv7[]`. The fetcher:
 *
 *   1. Reads `query.filters.tagSlugs` from the input.
 *   2. Calls `listTags()` to resolve each slug → UUIDv7 id.
 *   3. Forwards the resulting `tagIds` array to the SDK.
 *
 * Unknown slugs are silently dropped (the `useTagsDirectory` helper
 * does not surface 404s for missing tags). If no slugs resolve to
 * any ids, the fetcher omits `tagIds` from the call entirely.
 *
 * ## Client-side sort (drift #2 in A1)
 *
 * The SDK does NOT accept `sort` server-side. The hook applies the
 * sort client-side on the items returned for the current page only
 * (mirrors Story 3.4 line 472 — filter/sort operates on the current
 * page). The SWR key includes the sort, so changing the sort resets
 * the cursor (Story 3.5 line 578).
 *
 * ## 404 → empty contract
 *
 * "404 on `/quizzes` while the directory exists → treat as empty."
 * The fetcher catches `ApiError(404)` and returns `{ items: [],
 * nextCursor: null, hasNextPage: false, limit: 0 }` — the page
 * renders the empty state, NOT the `NotFound` component.
 *
 * ## 422 → coerce
 *
 * The backend rejects a `tagIds` array referring to non-existent tag
 * uuids with `ApiError(422)`. The fetcher catches that case and
 * retries once with an empty `tagIds` array — the directory treats
 * "no valid tag ids" as the same as "no tag filter applied".
 *
 * Other errors propagate normally so `useCursorPaginated`'s
 * retry-banner / error-state machinery takes over.
 *
 * ## `id` alias on `QuizListItemDto`
 *
 * `useCursorPaginated`'s generic constraint `T extends { id: string }`
 * requires a wire item to have an `id` field. The `QuizListItemDto`
 * DTO carries `quizId` (not `id`), so the fetcher aliases the value
 * here — the only place this aliasing happens. Downstream consumers
 * read `quizId`, never `id`.
 *
 * ## Switching filters resets the cursor
 *
 * The SWR key includes the `filters` object. The cursor primitive's
 * SWR key change forces the cache to be cleared and a fresh first
 * page to be fetched (Story 3.5 line 581).
 *
 * ## Soft-delete defensive filter (TKT-3.5.F2)
 *
 * The backend filters soft-deleted (`isHidden: true`) quizzes
 * server-side (Story 3.5 line 553). The fetcher ALSO filters them
 * here, AFTER the SDK response is unwrapped, so a future backend
 * regression that stops filtering can never reach the UI. The wire
 * item must include `isHidden: true` to be excluded.
 */

import { useCallback, useMemo, useState } from 'react'

import { ApiError, useCursorPaginated } from '@/lib/api'
import type { CursorPage } from '@/lib/api/use-cursor-paginated.types'
import type {
  QuizListItemDto,
  TagResponseDto,
} from '@/lib/api/generated/schemas'

import { listQuizzes } from '@/features/quizzes/api/quizzes.wrapper'
import { listTags } from '@/features/tags/wrappers/tag.wrapper'
import type { QuizFilterUrlState } from '@/features/quizzes/types/quiz-filter-params'

// ---------------------------------------------------------------------------
// Wire-shape envelope returned by `listQuizzes` (TKT-3.5.A2).
// ---------------------------------------------------------------------------

/**
 * Wire envelope returned by `listQuizzes` (post-`unwrap`).
 * Mirrors the post-`unwrap` shape `{ data, meta }`. The wrapper's
 * type generic consumes it without re-declaring the `meta.pagination`
 * shape (the lint rule disallows repeating the `nextCursor` field
 * outside the fetcher adapter).
 */
export interface QuizzesListResponse {
  data?: Array<QuizListItemDto & { [k: string]: unknown }>
  meta?: {
    pagination?: {
      kind: 'cursor'
      limit: number
      nextCursor: string | null
      hasNextPage: boolean
    }
  }
}

// ---------------------------------------------------------------------------
// Hook contract
// ---------------------------------------------------------------------------

export interface UseQuizzesListQuery {
  /**
   * URL-typed filter state. The URL is the source of truth — see
   * `parseQuizFilterUrl` / `serializeQuizFilterUrl` (TKT-3.5.A3).
   */
  filters: QuizFilterUrlState
  /** Page size passed to the SDK (1–100). */
  limit?: number
}

/** Each item carries a synthesised `id` (alias of `quizId`) so the cursor primitive's `appendUniqueById` works. */
type QuizListItemWithId = QuizListItemDto & { id: string }

/**
 * Public return type of `useQuizzesList`. Extends the cursor
 * primitive's `UseCursorPaginatedResult` with the `coercedFilters`
 * field that surfaces the post-422 coercion state (TKT-3.5.F3).
 *
 * `coercedFilters` is the filter state the hook actually used after
 * the 422-retry strategy removed the offending field. When the
 * coercion has not fired (the common case), `coercedFilters` is
 * `null` and the consumer's `query.filters` is the authoritative
 * state.
 */
export interface UseQuizzesListResult {
  items: readonly QuizListItemWithId[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  loadMore: () => void
  error: ApiError | null
  refresh: () => Promise<void>
  /**
   * The filter state actually used by the hook after the 422-coerce
   * strategy — or `null` when no coercion has fired. When set, the
   * offending field (e.g. `tagSlugs`) is absent.
   */
  coercedFilters: QuizFilterUrlState | null
}

export function useQuizzesList(query: UseQuizzesListQuery): UseQuizzesListResult {
  // The fetcher is a useMemo so the hook's identity is stable across
  // renders (Epic 3.2 D4 — race handling depends on a stable fetcher
  // reference).
  //
  // The `coercedFilters` state propagates the post-422 coercion from
  // the fetcher (which does the SDK call) to the consumer. The setter
  // is wired into the fetcher via the `setCoercedFilters` callback
  // below; updating the state triggers a re-render so the consumer
  // sees the coerced state on the next tick.
  const [coercedFilters, setCoercedFiltersState] = useState<
    QuizFilterUrlState | null
  >(null)

  // Stable setter reference — passed into the fetcher closure so the
  // fetcher's `useMemo` deps do not need to include the state setter.
  const setCoercedFilters = useCallback((next: QuizFilterUrlState | null) => {
    setCoercedFiltersState(next)
  }, [])

  const fetcher = useMemo(
    () =>
      async ({
        cursor,
        params,
      }: {
        cursor: string | null
        params: UseQuizzesListQuery
        signal?: AbortSignal
      }): Promise<CursorPage<QuizListItemWithId>> => {
        try {
          // Drift #1 — resolve `tagSlugs` → `tagIds` (UUIDv7) before
          // mounting the SDK call. Unknown slugs are silently dropped
          // (the tag directory returns only the slugs that exist).
          const tagIds = await resolveTagSlugsToIds(params.filters.tagSlugs)

          const result = await listQuizzes({
            cursor: cursor ?? undefined,
            limit: params.limit,
            categoryId: params.filters.categoryId,
            difficulty: toApiDifficulty(params.filters.difficulty),
            tagIds: tagIds.length > 0 ? tagIds : undefined,
          })

          const items = (result.data ?? []) as unknown as Array<QuizListItemWithId>
          // Synthesise `id` alias of `quizId` here — the only place
          // this aliasing happens. Downstream consumers read `quizId`,
          // never `id`.
          const itemsWithId = items.map((item) =>
            Object.assign({}, item, { id: item.quizId }),
          ) as Array<QuizListItemWithId>

          // Soft-delete contract lock (TKT-3.5.F2). The backend
          // filters `isHidden: true` quizzes server-side per Story 3.5
          // line 553, but the hook ALSO filters them here so a future
          // backend regression that stops filtering can never reach
          // the UI. The filter runs BEFORE the client-side sort so the
          // sort operates on the visible-only set.
          const visibleItems = itemsWithId.filter(
            (item) => item.isHidden !== true
          )

          // Drift #2 — apply the sort client-side on the items
          // returned for the current page only. The sort operates on
          // the current page; the cursor primitive does not refetch
          // additional pages to satisfy the sort.
          const sortedItems = params.filters.sort
            ? applyClientSort(visibleItems, params.filters.sort)
            : visibleItems

          const pagination = result.meta?.pagination
          return {
            items: sortedItems,
            nextCursor: pagination?.nextCursor ?? null,
            hasNextPage: pagination?.hasNextPage ?? false,
            limit: pagination?.limit ?? sortedItems.length,
          }
        } catch (err) {
          // 404 on the directory endpoint → treat as empty. The page
          // renders the empty state, not a `NotFound` component.
          if (err instanceof ApiError && err.status === 404) {
            return {
              items: [],
              nextCursor: null,
              hasNextPage: false,
              limit: 0,
            }
          }
          // 422 from invalid `tagIds` (e.g. a stale slug resolved to
          // a stale id that the backend has since invalidated) →
          // retry once with an empty `tagIds` array. The directory
          // treats "no valid tag ids" as the same as "no tag filter".
          //
          // The coercion is recorded in `coercedFiltersRef` so the
          // consumer can surface the post-coercion state (TKT-3.5.F3 —
          // the page "never 422s the user").
          if (err instanceof ApiError && err.status === 422) {
            try {
              const result = await listQuizzes({
                cursor: cursor ?? undefined,
                limit: params.limit,
                categoryId: params.filters.categoryId,
                difficulty: toApiDifficulty(params.filters.difficulty),
                tagIds: undefined,
              })
              const items = (result.data ?? []) as unknown as Array<QuizListItemWithId>
              const itemsWithId = items.map((item) =>
                Object.assign({}, item, { id: item.quizId }),
              ) as Array<QuizListItemWithId>
              // Soft-delete filter — see primary fetch path above.
              const visibleItems = itemsWithId.filter(
                (item) => item.isHidden !== true
              )
              // Record the coerced filter state. The offending field
              // — `tagSlugs` — is dropped; the rest of the filters
              // are preserved verbatim.
              setCoercedFilters({
                ...params.filters,
                tagSlugs: undefined
              })
              const pagination = result.meta?.pagination
              return {
                items: visibleItems,
                nextCursor: pagination?.nextCursor ?? null,
                hasNextPage: pagination?.hasNextPage ?? false,
                limit: pagination?.limit ?? visibleItems.length,
              }
            } catch {
              // If the retry also fails, surface the original error.
              throw err
            }
          }
          throw err
        }
      },
    [setCoercedFilters],
  )

  const result = useCursorPaginated<QuizListItemWithId, UseQuizzesListQuery>({
    key: ['quizzes', 'list', query.filters, { limit: query.limit }],
    fetcher,
    params: query,
    paginationKind: 'cursor',
  })

  return {
    items: result.items,
    isLoading: result.isLoading,
    isLoadingMore: result.isLoadingMore,
    hasMore: result.hasMore,
    loadMore: result.loadMore,
    error: result.error,
    refresh: result.refresh,
    coercedFilters
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Coerce the URL-typed `difficulty` value (which includes `'all'`
 * and `undefined` for the "no filter" affordance) to the SDK's
 * `'easy' | 'medium' | 'hard' | undefined` shape.
 */
function toApiDifficulty(
  difficulty: QuizFilterUrlState['difficulty'],
): 'easy' | 'medium' | 'hard' | undefined {
  if (difficulty === undefined || difficulty === 'all') return undefined
  return difficulty
}

/**
 * Resolve a list of tag slugs to a list of UUIDv7 tag ids.
 *
 * The function calls `listTags()` once and builds a `slug → id` map.
 * Unknown slugs are silently dropped (the planning doc line 582 says
 * "unknown tag slugs should be silently dropped").
 */
async function resolveTagSlugsToIds(slugs?: string[]): Promise<string[]> {
  if (!slugs || slugs.length === 0) return []

  const result = await listTags({ limit: 100 })
  const tags = (result.data ?? []) as unknown as TagResponseDto[]
  const slugMap = new Map<string, string>()
  for (const tag of tags) {
    slugMap.set(tag.slug, tag.tagId)
  }

  const ids: string[] = []
  for (const slug of slugs) {
    const id = slugMap.get(slug)
    if (id !== undefined) ids.push(id)
  }
  return ids
}

/**
 * Apply a client-side sort to a list of items in the current page.
 * Drift #2 — the SDK does NOT accept `sort` server-side.
 */
function applyClientSort(
  items: readonly QuizListItemWithId[],
  sort: NonNullable<QuizFilterUrlState['sort']>,
): readonly QuizListItemWithId[] {
  const sorted = items.slice()
  switch (sort) {
    case 'newest':
      // Sort by `createdAt` descending. Items without `createdAt` go
      // last (defensive against the backend omitting the field).
      sorted.sort((a, b) => {
        const ta = a.createdAt ? Date.parse(a.createdAt) : 0
        const tb = b.createdAt ? Date.parse(b.createdAt) : 0
        return tb - ta
      })
      break
    case 'popular':
      // `QuizListItemDto` does not carry a popularity score (that's
      // `PopularQuizItemDto`'s job). For the directory, "popular"
      // sorts by `title` ascending as a stable placeholder until the
      // backend exposes a sortable field here. The placeholder is
      // documented in drift #2 in A1.
      sorted.sort((a, b) => a.title.localeCompare(b.title))
      break
    case 'top_rated':
      // Same drift — `QuizListItemDto` does not carry an average
      // rating. Sort by `title` ascending as a stable placeholder.
      sorted.sort((a, b) => a.title.localeCompare(b.title))
      break
    case 'trending':
      // Same drift — `QuizListItemDto` does not carry a trending
      // score. Sort by `title` ascending as a stable placeholder.
      sorted.sort((a, b) => a.title.localeCompare(b.title))
      break
  }
  return sorted
}