import { serverGet } from '@/shared/lib/api/server'
import type { Category, CategoryListResponse } from '../types'

export async function getCategoriesServer(params?: {
  cursor?: string
  limit?: number
}): Promise<CategoryListResponse> {
  return serverGet('/categories', params)
}

export async function getCategoryBySlugServer(slug: string): Promise<Category> {
  return serverGet(`/categories/${slug}`)
}
