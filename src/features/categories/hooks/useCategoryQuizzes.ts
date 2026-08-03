'use client'

/**
 * `useCategoryQuizzes` — cursor-paginated list of quizzes in a category.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source ticket: TKT-3.3.B4.
 *
 * Wraps `getCategoryQuizzes` (the A2 service wrapper) in the
 * `useCursorPaginated` primitive (Epic 3.2). This is the first
 * Phase-3 feature-level hook that consumes the cursor pagination
 * primitive end-to-end.
 *
 * ## Fetcher adapter — the only place `nextCursor` is read in this story
 *
 * Per the cross-story contract rule #7 ("the `data` and `meta` keys
 * from the success envelope never reach component state directly"),
 * the fetcher adapter is the only place `pagination.nextCursor` is
 * allowed to be read. The adapter reads it exactly once per page and
 * adapts the wire shape (`{ data, meta }`) to the hook's expected
 * shape (`{ items, nextCursor, hasNextPage, limit }`). All other
 * consumers of this hook receive only the public `UseCursorPaginatedResult`
 * shape — never `nextCursor` or `pagination`.
 *
 * ## 404 → empty contract (closes Story 3.3 line 341)
 *
 * "404 on `/categories/:id/quizzes` while the category exists → treat
 * as empty." The fetcher catches an `ApiError(404)` and returns
 * `{ items: [], nextCursor: null, hasNextPage: false, limit: 0 }` —
 * the page renders the empty state, NOT the `NotFound` component.
 *
 * Other errors propagate normally so `useCursorPaginated`'s
 * retry-banner / error-state machinery takes over.
 */

import { useMemo } from 'react'

import { ApiError, useCursorPaginated } from '@/lib/api'
import type { CursorPage } from '@/lib/api/use-cursor-paginated.types'
import type { QuizListItemDto } from '@/lib/api/generated/schemas'

import { getCategoryQuizzes } from '@/features/categories/services/categories.service'

export interface UseCategoryQuizzesParams {
  /** Page size passed to the SDK (1–100). */
  limit?: number
}

export function useCategoryQuizzes(
  idOrSlug: string,
  params: UseCategoryQuizzesParams = {},
) {
  // The fetcher is a useMemo so the hook's identity is stable across
  // renders (Epic 3.2 D4 — race handling depends on a stable fetcher
  // reference).
  const fetcher = useMemo(
    () =>
      async ({
        cursor,
      }: {
        cursor: string | null
        params: UseCategoryQuizzesParams
        signal?: AbortSignal
      }): Promise<CursorPage<QuizListItemDto & { id: string }>> => {
        try {
          const result = await getCategoryQuizzes(idOrSlug, {
            cursor: cursor ?? undefined,
            limit: params.limit,
          })
          const items = (result.data ?? []) as unknown as Array<
            QuizListItemDto & { id: string }
          >
          // The SDK response items carry `quizId` (not `id`); the cursor
          // primitive's `appendUniqueById` dedup helper requires every T
          // to extend `{ id: string }`. We synthesize an `id` alias here
          // — the only place this aliasing happens — and downstream
          // consumers read `quizId`, never `id`.
          const itemsWithId = items.map((item) =>
            Object.assign({}, item, { id: item.quizId }),
          ) as Array<QuizListItemDto & { id: string }>

          const pagination = result.meta?.pagination
          return {
            items: itemsWithId,
            nextCursor: pagination?.nextCursor ?? null,
            hasNextPage: pagination?.hasNextPage ?? false,
            limit: pagination?.limit ?? itemsWithId.length,
          }
        } catch (err) {
          // 404 on the sub-endpoint while the category exists → treat as
          // empty. The hook contract: items=[], hasMore=false, no error.
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
    [idOrSlug, params.limit],
  )

  return useCursorPaginated<QuizListItemDto & { id: string }, UseCategoryQuizzesParams>(
    {
      key: ['category', idOrSlug, 'quizzes', params],
      fetcher,
      params,
      paginationKind: 'cursor',
    },
  )
}
