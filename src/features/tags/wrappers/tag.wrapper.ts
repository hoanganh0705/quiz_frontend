/**
 * Tags wrapper — wraps API calls with the custom API client.
 * Uses the generated SDK from orval.
 */

import { getTags } from '@/lib/api/generated/tags/tags';
import type {
  CreateTagDto,
  UpdateTagDto,
} from '@/lib/api/generated/schemas';

export type {
  TagControllerListTagsResult,
  TagControllerCreateTagResult,
  TagControllerGetTagBySlugResult,
  TagControllerUpdateTagResult,
  TagControllerDeleteTagResult,
} from '@/lib/api/generated/tags/tags';

export interface ListTagsParams {
  cursor?: string
  limit?: number
}

export async function listTags(params?: ListTagsParams) {
  const sdk = getTags();
  return sdk.tagControllerListTags(params);
}

export async function getTagBySlug(slug: string) {
  const sdk = getTags();
  return sdk.tagControllerGetTagBySlug(slug);
}

export async function createTag(params: CreateTagDto) {
  const sdk = getTags();
  return sdk.tagControllerCreateTag(params);
}

export async function updateTag(id: string, params: UpdateTagDto) {
  const sdk = getTags();
  return sdk.tagControllerUpdateTag(id, params);
}

export async function deleteTag(id: string) {
  const sdk = getTags();
  return sdk.tagControllerDeleteTag(id);
}
