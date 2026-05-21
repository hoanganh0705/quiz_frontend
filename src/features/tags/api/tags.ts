import { apiClient } from '@/shared/lib/api/client'

export async function getTags(params?: {
  cursor?: string
  limit?: number
}): Promise<{
  items: import('../types').Tag[]
  pagination: {
    limit: number
    nextCursor: string | null
    hasNextPage: boolean
  }
}> {
  const response = await apiClient.get('/tags', { params })
  return response.data
}

export async function getTagBySlug(slug: string): Promise<import('../types').Tag> {
  const response = await apiClient.get(`/tags/${slug}`)
  return response.data
}
