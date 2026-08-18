'use client'

import useSWR from 'swr'

import { ApiError } from '@/lib/api'
import type { TagAnalyticsResponseDto } from '@/lib/api/generated/schemas'

import { getTagAnalytics } from '@/features/tags/services/tags.service'

export interface UseTagAnalyticsResult {
analytics: TagAnalyticsResponseDto | null
isLoading: boolean
error: ApiError | null
}

export function useTagAnalytics(id: string): UseTagAnalyticsResult {
const key = ['tag', id, 'analytics'] as const

const { data, error, isLoading } = useSWR(
key,
async () => {
const result = await getTagAnalytics(id)
return result.data ?? null
    },
{
      // Inherit the global SwrProvider defaults.
    },
  )

const apiError = error instanceof ApiError ? error : null

const isNotFound = apiError?.status === 404

return {
analytics: isNotFound ? null : (data ?? null),
isLoading,
error: isNotFound ? null : apiError,
  }
}
