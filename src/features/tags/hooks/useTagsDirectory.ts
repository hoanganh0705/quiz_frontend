'use client'

/**
 * `useTagsDirectory(query)` — debounced filter + cursor-paginated
 * tag directory.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.E1 (scaffolded within Batch D so that
 * TKT-3.4.D2 — `<TagsDirectoryPage>` — has a real dependency to
 * consume).
 *
 * Wraps `useCursorPaginated` from Epic 3.2 with a fetcher that
 * calls the existing `listTags` (from `tag.wrapper.ts`) and applies
 * the client-side filter to the items returned for the current page
 * only — the filter is client-side, per Story 3.4 line 472.
 *
 * ## SWR key includes the debounced filter
 *
 * The hook debounces the `filter` value 250 ms (the same debounce
 * cadence as the filter input) and uses the debounced value as
 * part of the SWR key. Switching filters resets the cursor
 * (Story 3.4 line 473) — the previous page's items are cleared
 * from the cache before the new page is appended.
 *
 * The hook is the second phase-3 feature-level hook that consumes
 * the cursor pagination primitive end-to-end (after Story 3.3's
 * `useCategoryQuizzes`).
 *
 * ## 404 → empty contract
 *
 * The fetcher catches `ApiError(404)` and returns `{ items: [],
 * nextCursor: null, hasNextPage: false, limit: 0 }` — the page
 * renders the empty state, not a `NotFound` component.
 *
 * ## Fetcher adapter
 *
 * The fetcher is the only place `pagination.nextCursor` is read.
 * Per the cross-story contract rule #7, the `data` and `meta` keys
 * from the success envelope never reach component state directly.
 * All consumers of this hook receive only the public
 * `UseCursorPaginatedResult` shape — never `nextCursor` or `pagination`.
 *
 * ## `id` alias on `TagResponseDto`
 *
 * `useCursorPaginated`'s generic constraint `T extends { id: string }`
 * requires a wire item to have an `id` field. The `TagResponseDto`
 * DTO carries `tagId` (not `id`), so the fetcher aliases the value
 * here — the only place this aliasing happens. Downstream consumers
 * read `tagId`, never `id`.
 */

import { useMemo } from 'react'

import { ApiError, useCursorPaginated } from '@/lib/api'
import type { CursorPage } from '@/lib/api/use-cursor-paginated.types'
import type { TagResponseDto } from '@/lib/api/generated/schemas'

import { listTags } from '@/features/tags/services/tags.service'
import { useDebouncedValue } from '@/lib/utils/use-debounced-value'

const FILTER_DEBOUNCE_MS = 250

export interface UseTagsDirectoryQuery {
  /** Client-side filter — matches `slug.startsWith(...) || name.toLowerCase().includes(...)`. */
  filter: string
  /** Page size passed to the SDK (1–100). */
  limit?: number
}

/** Each item carries a synthesised `id` (alias of `tagId`) so the cursor primitive's `appendUniqueById` works. */
type TagDirItem = TagResponseDto & { id: string }

export function useTagsDirectory(query: UseTagsDirectoryQuery) {
  const debouncedFilter = useDebouncedValue(query.filter, FILTER_DEBOUNCE_MS)

  // The fetcher is a useMemo so the hook's identity is stable across
  // renders (Epic 3.2 D4 — race handling depends on a stable fetcher
  // reference).
  const fetcher = useMemo(
    () =>
      async ({
        cursor,
        params,
      }: {
        cursor: string | null
        params: UseTagsDirectoryQuery
        signal?: AbortSignal
      }): Promise<CursorPage<TagDirItem>> => {
        try {
          const result = await listTags({
            cursor: cursor ?? undefined,
            limit: params.limit,
          })
          const items = (result.data ?? []) as unknown as Array<
            TagResponseDto & { id: string }
          >
          // The SDK response items carry `tagId` (not `id`); the cursor
          // primitive's `appendUniqueById` dedup helper requires every T
          // to extend `{ id: string }`. We synthesize an `id` alias here
          // — the only place this aliasing happens — and downstream
          // consumers read `tagId`, never `id`.
          const itemsWithId = items.map((item) =>
            Object.assign({}, item, { id: item.tagId }),
          ) as Array<TagResponseDto & { id: string }>

          const pagination = result.meta?.pagination
          return {
            items: itemsWithId,
            nextCursor: pagination?.nextCursor ?? null,
            hasNextPage: pagination?.hasNextPage ?? false,
            limit: pagination?.limit ?? itemsWithId.length,
          }
        } catch (err) {
          // 404 on the directory endpoint → treat as empty. The
          // page renders the empty state, not a `NotFound` component.
          if (err instanceof ApiError && err.status === 404) {
            return {
              items: [],
              nextCursor: null,
              hasNextPage: false,
              limit: 0,
            }
          }
          throw err
        }
      },
    [],
  )

  const result = useCursorPaginated<TagDirItem, UseTagsDirectoryQuery>({
    key: ['tags', 'directory', debouncedFilter, { limit: query.limit }],
    fetcher,
    params: { filter: debouncedFilter, limit: query.limit },
    paginationKind: 'cursor',
  })

  // The hook's public contract is `TagResponseDto[]` (no `id` alias).
  // The cursor primitive returns `Array<TagDirItem>`. We strip the
  // alias at this boundary so downstream consumers (D2) only ever
  // see `TagResponseDto`.
  const wireItems = result.items as readonly TagResponseDto[]

  // Apply the client-side filter to the current page's items
  // (Story 3.4 line 472). The hook does NOT load additional pages
  // to satisfy the filter — the filter operates on the current
  // page only.
  const trimmed = debouncedFilter.trim().toLowerCase()
  const filteredItems = trimmed
    ? wireItems.filter(
        (tag) =>
          tag.slug.toLowerCase().startsWith(trimmed) ||
          tag.name.toLowerCase().includes(trimmed),
      )
    : wireItems

  return {
    ...result,
    items: filteredItems,
  }
}
