import { apiClient } from '@/shared/lib/api/client'
import type { Tag, TagListResponse, DeleteTagResponse } from '../types'

export async function getTags(params?: {
  cursor?: string
  limit?: number
}): Promise<TagListResponse> {
  const response = await apiClient.get('/tags', { params })
  return response.data
}

export async function getTagBySlug(slug: string): Promise<Tag> {
  const response = await apiClient.get(`/tags/${slug}`)
  return response.data
}

export async function createTag(payload: {
  name: string
  slug?: string
}): Promise<Tag> {
  const response = await apiClient.post('/tags', payload)
  return response.data
}

export async function updateTag(
  id: string,
  payload: {
    name?: string
    slug?: string
  }
): Promise<Tag> {
  const response = await apiClient.patch(`/tags/${id}`, payload)
  return response.data
}

export async function deleteTag(id: string): Promise<DeleteTagResponse> {
  const response = await apiClient.delete(`/tags/${id}`)
  return response.data
}
