import { serverGet, cacheProfiles } from '@/shared/lib/api/server'
import type { Tag, TagListResponse } from '../types'

export async function getTagsServer(params?: {
  cursor?: string
  limit?: number
}): Promise<TagListResponse> {
  return serverGet('/tags', params, cacheProfiles.stable)
}

export async function getTagBySlugServer(slug: string): Promise<Tag> {
  return serverGet(`/tags/${slug}`, undefined, cacheProfiles.stable)
}
