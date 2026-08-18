'use client'

import useSWR from 'swr'

import { ApiError } from '@/lib/api'
import type { TagResponseDto } from '@/lib/api/generated/schemas'

import { getRelatedTags } from '@/features/tags/services/tags.service'

export interface UseTagRelatedParams {
limit?: number
}

export interface UseTagRelatedResult {
tags: readonly TagResponseDto[]
isLoading: boolean
error: ApiError | null
}

export function useTagRelated(
slug: string,
params: UseTagRelatedParams = {},
): UseTagRelatedResult {
const key = ['tag', slug, 'related', params] as const

const { data, error, isLoading } = useSWR(
key,
async () => {
const result = await getRelatedTags(slug, { limit: params.limit })
return result.data ?? []
    },
{
      // Inherit the global SwrProvider defaults.
    },
  )

return {
tags: data ?? [],
isLoading,
error: error instanceof ApiError ? error : null,
  }
}
