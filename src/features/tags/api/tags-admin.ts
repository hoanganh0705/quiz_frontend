/**
 * Tags Admin API - Re-exports from wrapper for admin compatibility
 * @deprecated Use wrappers instead: import { listTags, createTag, ... } from '@/features/tags/wrappers'
 */

import { listTags, createTag, updateTag, deleteTag } from '@/features/tags/wrappers/tag.wrapper';
import type { CreateTagDto, UpdateTagDto } from '@/lib/api/generated/schemas';

export type { ListTagsParams } from '@/features/tags/wrappers/tag.wrapper';

export interface Tag {
  tagId: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt?: string;
}

export interface GetTagsParams {
  cursor?: string;
  limit?: number;
}

// Re-export functions that work for both admin and non-admin use
export async function getTagsAdmin(params?: GetTagsParams) {
  return listTags(params);
}

// Create a new tag
export async function createTagAdmin(params: CreateTagDto) {
  return createTag(params);
}

// Update an existing tag
export async function updateTagAdmin(tagId: string, params: UpdateTagDto) {
  return updateTag(tagId, params);
}

// Delete a tag
export async function deleteTagAdmin(tagId: string) {
  return deleteTag(tagId);
}
