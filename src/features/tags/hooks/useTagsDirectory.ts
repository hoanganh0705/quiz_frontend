'use client'

import { useMemo } from 'react'

import { ApiError, projectWithId, useCursorPaginated } from '@/lib/api'
import type { CursorPage } from '@/lib/api/use-cursor-paginated.types'
import type { TagResponseDto } from '@/lib/api/generated/schemas'

import { listTags } from '@/features/tags/services/tags.service'
import { useDebouncedValue } from '@/lib/utils/use-debounced-value'

const FILTER_DEBOUNCE_MS = 250

export interface UseTagsDirectoryQuery {

filter: string

limit?: number
}

type TagDirItem = TagResponseDto & { id: string }

export function useTagsDirectory(query: UseTagsDirectoryQuery) {
const debouncedFilter = useDebouncedValue(query.filter, FILTER_DEBOUNCE_MS).debouncedValue

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

const itemsWithId = projectWithId(items as unknown as readonly Record<string, unknown>[], 'tagId')

const pagination = result.meta?.pagination
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
[],
  )

const result = useCursorPaginated<TagDirItem, UseTagsDirectoryQuery>({
key: ['tags', 'directory', debouncedFilter, { limit: query.limit }],
fetcher,
params: { filter: debouncedFilter, limit: query.limit },
paginationKind: 'cursor',
  })

const wireItems = result.items as readonly TagResponseDto[]

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
