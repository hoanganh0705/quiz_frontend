
"use client"

import { useCallback, useMemo, useState } from "react"

import { ApiError, projectWithId, useCursorPaginated, type ProjectWithId } from "@/lib/api"
import type { CursorPage } from "@/lib/api/use-cursor-paginated.types"
import type {
  QuizListItemDto,
  TagResponseDto,
} from "@/lib/api/generated/schemas"

import { listQuizzes } from "@/features/quizzes/services/quizzes.service"
import { listTags } from "@/features/tags/services/tags.service"
import type { QuizFilterUrlState } from "@/features/quizzes/types/quiz-filter-params"

export interface QuizzesListResponse {
  data?: Array<QuizListItemDto & { [k: string]: unknown }>
  meta?: {
    pagination?: {
      kind: "cursor"
      limit: number
      nextCursor: string | null
      hasNextPage: boolean
    }
  }
}

export interface UseQuizzesListQuery {
  filters: QuizFilterUrlState
  limit?: number
}

type QuizListItemWithId = ProjectWithId<QuizListItemDto, "quizId">

export interface UseQuizzesListResult {
  items: readonly QuizListItemWithId[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  loadMore: () => void
  error: ApiError | null
  refresh: () => Promise<void>
  coercedFilters: QuizFilterUrlState | null
}

export function useQuizzesList(query: UseQuizzesListQuery): UseQuizzesListResult {
  const [coercedFilters, setCoercedFiltersState] = useState<
    QuizFilterUrlState | null
  >(null)

  const setCoercedFilters = useCallback((next: QuizFilterUrlState | null) => {
    setCoercedFiltersState(next)
  }, [])

  const fetcher = useMemo(
    () =>
      async ({
        cursor,
        params,
        signal,
      }: {
        cursor: string | null
        params: UseQuizzesListQuery
        signal?: AbortSignal
      }): Promise<CursorPage<QuizListItemWithId>> => {
        try {
          const tagIds = await resolveTagSlugsToIds(
            params.filters.tagSlugs,
            signal,
          )

          const result = await listQuizzes({
            cursor: cursor ?? undefined,
            limit: params.limit,
            categoryId: params.filters.categoryId,
            difficulty: toApiDifficulty(params.filters.difficulty),
            tagIds: tagIds.length > 0 ? tagIds : undefined,
            signal,
          })

          const items = (result.data ?? []) as unknown as Array<QuizListItemWithId>

          const itemsWithId = projectWithId(
            items as unknown as readonly Record<string, unknown>[],
            "quizId",
          ) as unknown as QuizListItemWithId[]

          const visibleItems = itemsWithId.filter(
            (item) => item.isHidden !== true,
          )

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
          if (err instanceof ApiError && err.status === 404) {
            return {
              items: [],
              nextCursor: null,
              hasNextPage: false,
              limit: 0,
            }
          }

          if (err instanceof ApiError && err.status === 422) {
            try {
              const result = await listQuizzes({
                cursor: cursor ?? undefined,
                limit: params.limit,
                categoryId: params.filters.categoryId,
                difficulty: toApiDifficulty(params.filters.difficulty),
                tagIds: undefined,
                signal,
              })
              const items = (result.data ?? []) as unknown as Array<QuizListItemWithId>
              const itemsWithId = projectWithId(
                items as unknown as readonly Record<string, unknown>[],
                "quizId",
              ) as unknown as QuizListItemWithId[]

              const visibleItems = itemsWithId.filter(
                (item) => item.isHidden !== true,
              )

              setCoercedFilters({
                ...params.filters,
                tagSlugs: undefined,
              })
              const pagination = result.meta?.pagination
              return {
                items: visibleItems,
                nextCursor: pagination?.nextCursor ?? null,
                hasNextPage: pagination?.hasNextPage ?? false,
                limit: pagination?.limit ?? visibleItems.length,
              }
            } catch {
              throw err
            }
          }
          throw err
        }
      },
    [setCoercedFilters],
  )

  const result = useCursorPaginated<QuizListItemWithId, UseQuizzesListQuery>({
    key: ["quizzes", "list", query.filters, { limit: query.limit }],
    fetcher,
    params: query,
    paginationKind: "cursor",
  })

  return {
    items: result.items,
    isLoading: result.isLoading,
    isLoadingMore: result.isLoadingMore,
    hasMore: result.hasMore,
    loadMore: result.loadMore,
    error: result.error,
    refresh: result.refresh,
    coercedFilters,
  }
}

function toApiDifficulty(
  difficulty: QuizFilterUrlState["difficulty"],
): "easy" | "medium" | "hard" | undefined {
  if (difficulty === undefined || difficulty === "all") return undefined
  return difficulty
}

async function resolveTagSlugsToIds(
  slugs?: string[],
  signal?: AbortSignal,
): Promise<string[]> {
  if (!slugs || slugs.length === 0) return []

  const result = await listTags({ limit: 100, signal })
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
 * Client-side sort fallback. The wire shape ships the fields we need for
 * each ordering; when the API eventually accepts `sort` we'll forward the
 * value and delete this fallback. Until then this is the source of truth
 * for the visual ordering the user sees after picking a non-default sort.
 *
 * `popular` → attemptCount desc (the proxy the backend uses for the rail)
 * `trending` → recency-weighted: createdAt desc
 * `top_rated` → averageRating desc, then reviewCount desc as tiebreaker
 * `newest` → createdAt desc
 */
function applyClientSort(
  items: readonly QuizListItemWithId[],
  sort: NonNullable<QuizFilterUrlState["sort"]>,
): readonly QuizListItemWithId[] {
  const sorted = items.slice()
  const byCreatedAtDesc = (a: QuizListItemWithId, b: QuizListItemWithId) => {
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0
    return tb - ta
  }
  switch (sort) {
    case "popular":
      sorted.sort((a, b) => b.attemptCount - a.attemptCount || byCreatedAtDesc(a, b))
      break
    case "top_rated":
      sorted.sort(
        (a, b) =>
          b.averageRating - a.averageRating ||
          b.reviewCount - a.reviewCount ||
          byCreatedAtDesc(a, b),
      )
      break
    case "trending":
      sorted.sort(byCreatedAtDesc)
      break
    case "newest":
      sorted.sort(byCreatedAtDesc)
      break
  }
  return sorted
}
