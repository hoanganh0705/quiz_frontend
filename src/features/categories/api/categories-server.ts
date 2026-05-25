import { serverGet, cacheProfiles } from '@/shared/lib/api/server'
import type { Category, CategoryListResponse } from '../types'

export async function getCategoriesServer(params?: {
  cursor?: string
  limit?: number
}): Promise<CategoryListResponse> {
  return serverGet('/categories', params, cacheProfiles.stable)
}

export async function getCategoryBySlugServer(slug: string): Promise<Category> {
  return serverGet(`/categories/${slug}`, undefined, cacheProfiles.stable)
}
