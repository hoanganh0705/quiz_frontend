'use client'

import useSWR from 'swr'

import { ApiError } from '@/lib/api'
import type { CategoryResponseDto } from '@/lib/api/generated/schemas'

import { getCategoryBySlug } from '@/features/categories/services/categories.service'

export interface UseCategoryResult {
category: CategoryResponseDto | null
isLoading: boolean
error: ApiError | null

notFound: boolean
}

export function useCategory(idOrSlug: string): UseCategoryResult {
const key = ['category', idOrSlug] as const

const { data, error, isLoading } = useSWR(
key,
async () => {
const result = await getCategoryBySlug(idOrSlug)
return result.data ?? null
    },
{
      // Inherit the global SwrProvider defaults.
    },
  )

const apiError = error instanceof ApiError ? error : null
const notFound = apiError?.status === 404

return {
category: data ?? null,
isLoading,
error: apiError,
notFound,
  }
}
