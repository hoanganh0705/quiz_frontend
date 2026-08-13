'use client'

/**
 * `useTagQuizzes` — cursor-paginated list of quizzes in a tag.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.B4.
 *
 * Wraps `getTagQuizzes` (the A2 service wrapper) in the
 * `useCursorPaginated` primitive (Epic 3.2). This is the second
 * Phase-3 feature-level hook that consumes the cursor pagination
 * primitive end-to-end (after Story 3.3's `useCategoryQuizzes`).
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
 * ## 404 → empty contract (closes Story 3.4 line 458)
 *
 * "404 on `/tags/:slug/quizzes` while the tag exists → treat as
 * empty." The fetcher catches an `ApiError(404)` and returns
 * `{ items: [], nextCursor: null, hasNextPage: false, limit: 0 }` —
 * the page renders the empty state, NOT the `NotFound` component.
 *
 * Other errors propagate normally so `useCursorPaginated`'s
 * retry-banner / error-state machinery takes over.
 *
 * ## Drift note (TKT-3.4.A1 §2)
 *
 * The SDK's `tagControllerGetTagQuizzes(slug)` does NOT accept a
 * `params` argument — the orval-generated signature is `slug` only.
 * The wrapper extends the call to `orvalCustomInstance` directly so
 * the cursor + limit envelope can be sent on the wire (the backend
 * supports it; the SDK just didn't expose it). The `getTagQuizzes`
 * wrapper signature accepts `{ cursor?: string; limit?: number }`
 * to match the hook's contract.
 */

import { useMemo } from 'react'

import { ApiError, projectWithId, useCursorPaginated } from '@/lib/api'
import type { CursorPage } from '@/lib/api/use-cursor-paginated.types'
import type { QuizListItemDto } from '@/lib/api/generated/schemas'
import type { TagControllerGetTagQuizzes200 } from '@/lib/api/generated/schemas'

import { getTagQuizzes } from '@/features/tags/services/tags.service'

/**
 * Wire-shape envelope returned by `getTagQuizzes` (TKT-3.4.A2).
 *
 * Phase 6: the SDK now exposes a typed `params` argument on
 * `tagControllerGetTagQuizzes`, so we re-export the SDK's
 * `TagControllerGetTagQuizzes200` (which is the intersection
 * `WrappedPaginatedDto & QuizListResponseDto` per the OpenAPI
 * union) and the hook reads `data[]` and `meta.pagination` off
 * it. The cursor-paginated primitive stays agnostic of how the
 * envelope was assembled — the SDK owns that contract.
 */
export type TagQuizzesResponse = TagControllerGetTagQuizzes200;

export interface UseTagQuizzesParams {
  /** Page size passed to the SDK (1–100). */
  limit?: number
}

export function useTagQuizzes(
  slug: string,
  params: UseTagQuizzesParams = {},
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
        params: UseTagQuizzesParams
        signal?: AbortSignal
      }): Promise<CursorPage<QuizListItemDto & { id: string }>> => {
        try {
          const result = await getTagQuizzes(slug, {
            cursor: cursor ?? undefined,
            limit: params.limit,
          })
          const items = (result.data ?? []) as unknown as Array<
            QuizListItemDto & { id: string }
          >
          // The SDK response items carry `quizId` (not `id`); the cursor
          // primitive's `appendUniqueById` dedup helper requires every T
          // to extend `{ id: string }`. We project `quizId` onto `id` here
          // via the runtime helper — the only place this aliasing
          // happens — and downstream consumers read `quizId`,
          // never `id`.
          const pagination = result.meta?.pagination
          const itemsWithId = projectWithId(items as unknown as readonly Record<string, unknown>[], 'quizId')
           
          return {
            items: itemsWithId as any,
            nextCursor: pagination?.nextCursor ?? null,
            hasNextPage: pagination?.hasNextPage ?? false,
            limit: pagination?.limit ?? itemsWithId.length,
          }
        } catch (err) {
          // 404 on the sub-endpoint while the tag exists → treat as
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
    [slug, params.limit],
  )

  return useCursorPaginated<QuizListItemDto & { id: string }, UseTagQuizzesParams>(
    {
      key: ['tag', slug, 'quizzes', params],
      fetcher,
      params,
      paginationKind: 'cursor',
    },
  )
}
