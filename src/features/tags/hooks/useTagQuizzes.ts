'use client'

import { useMemo } from 'react'

import { ApiError, projectWithId, useCursorPaginated } from '@/lib/api'
import type { CursorPage } from '@/lib/api/use-cursor-paginated.types'
import type { QuizListItemDto } from '@/lib/api/generated/schemas'
import type { TagControllerGetTagQuizzes200 } from '@/lib/api/generated/schemas'

import { getTagQuizzes } from '@/features/tags/services/tags.service'

export type TagQuizzesResponse = TagControllerGetTagQuizzes200;

export interface UseTagQuizzesParams {

limit?: number
}

export function useTagQuizzes(
slug: string,
params: UseTagQuizzesParams = {},
) {

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

const pagination = result.meta?.pagination
const itemsWithId = projectWithId(items as unknown as readonly Record<string, unknown>[], 'quizId')

return {
items: itemsWithId as any,
nextCursor: pagination?.nextCursor ?? null,
hasNextPage: pagination?.hasNextPage ?? false,
limit: pagination?.limit ?? itemsWithId.length,
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
