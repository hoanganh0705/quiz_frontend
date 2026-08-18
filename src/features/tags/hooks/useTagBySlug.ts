'use client'

import useSWR from 'swr'

import { ApiError } from '@/lib/api'
import type { TagResponseDto } from '@/lib/api/generated/schemas'

import { getTagBySlug } from '@/features/tags/services/tags.service'

export interface UseTagBySlugResult {
tag: TagResponseDto | null
isLoading: boolean
error: ApiError | null

notFound: boolean
}

export function useTagBySlug(slug: string): UseTagBySlugResult {
const key = ['tag', slug] as const

const { data, error, isLoading } = useSWR(
key,
async () => {
const result = await getTagBySlug(slug)
return result.data ?? null
    },
{
      // Inherit the global SwrProvider defaults.
    },
  )

const apiError = error instanceof ApiError ? error : null
const notFound = apiError?.status === 404

return {
tag: data ?? null,
isLoading,
error: apiError,
notFound,
  }
}
