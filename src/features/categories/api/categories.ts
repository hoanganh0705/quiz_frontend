import { apiClient } from '@/shared/lib/api/client'

export async function getCategories(params?: {
  cursor?: string
  limit?: number
}): Promise<{
  items: import('../types').Category[]
  pagination: {
    limit: number
    nextCursor: string | null
    hasNextPage: boolean
  }
}> {
  const response = await apiClient.get('/categories', { params })
  return response.data
}

export async function getCategoryBySlug(slug: string): Promise<import('../types').Category> {
  const response = await apiClient.get(`/categories/${slug}`)
  return response.data
}
