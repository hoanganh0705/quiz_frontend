/**
 * Tags wrapper — wraps API calls with the custom API client.
 */

import { customInstance } from '@/lib/api/core/custom-instance';
import type {
  Tag,
  TagListResponse,
} from '@/features/tags/types';

export interface ListTagsParams {
  cursor?: string
  limit?: number
}

export async function listTags(params?: ListTagsParams): Promise<TagListResponse> {
  const response = await customInstance.get<TagListResponse>(
    '/tags',
    { params }
  );
  return response.data;
}

export async function getTagBySlug(slug: string): Promise<Tag> {
  const response = await customInstance.get<Tag>(
    `/tags/${slug}`
  );
  return response.data;
}

// Admin-only functions (require authentication)
export interface CreateTagParams {
  name: string
  slug?: string
}

export async function createTag(params: CreateTagParams): Promise<Tag> {
  const response = await customInstance.post<Tag>(
    '/tags',
    params
  );
  return response.data;
}

export async function updateTag(
  id: string,
  params: Partial<CreateTagParams>
): Promise<Tag> {
  const response = await customInstance.patch<Tag>(
    `/tags/${id}`,
    params
  );
  return response.data;
}

export async function deleteTag(id: string): Promise<{ message: string }> {
  const response = await customInstance.delete<{ message: string }>(
    `/tags/${id}`
  );
  return response.data;
}
