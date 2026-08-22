

import { getTags } from '@/lib/api';

import type {
CreateTagDto,
UpdateTagDto,
} from '@/lib/api/generated/schemas';

import type { TagQuizzesResponse } from '../hooks/useTagQuizzes';

export type {
TagControllerListTagsResult,
TagControllerCreateTagResult,
TagControllerGetTagBySlugResult,
TagControllerUpdateTagResult,
TagControllerDeleteTagResult,
TagControllerGetPopularTagsResult,
TagControllerGetTrendingTagsResult,
TagControllerGetTagQuizzesResult,
TagControllerGetRelatedTagsResult,
TagControllerGetTagAnalyticsResult,
TagControllerGetTagByIdResult,
TagControllerFollowTagResult,
TagControllerUnfollowTagResult,
UserTagControllerListFollowedTagsResult,
} from '@/lib/api/generated/tags/tags';

export interface ListTagsParams {
  cursor?: string;
  limit?: number;
  signal?: AbortSignal;
}

export async function listTags(params?: ListTagsParams) {
  const sdk = getTags();
  const forwarded: Record<string, unknown> = {};
  if (params?.cursor !== undefined) forwarded.cursor = params.cursor;
  if (params?.limit !== undefined) forwarded.limit = params.limit;
  if (params?.signal !== undefined) forwarded.signal = params.signal;
  return sdk.tagControllerListTags(
    forwarded as Parameters<typeof sdk.tagControllerListTags>[0],
  );
}

export async function getTagBySlug(slug: string) {
const sdk = getTags();
return sdk.tagControllerGetTagBySlug(slug);
}

export const getTag = getTagBySlug;

export async function getTagsPopular(params?: { limit?: number }) {
const sdk = getTags();
return sdk.tagControllerGetPopularTags(params);
}

export async function getTagsTrending(params?: { limit?: number }) {
const sdk = getTags();
return sdk.tagControllerGetTrendingTags(params);
}

export async function getTagQuizzes(
slug: string,
params?: { cursor?: string; limit?: number },
): Promise<TagQuizzesResponse> {
const sdk = getTags();
return sdk.tagControllerGetTagQuizzes(slug, params);
}

export async function getRelatedTags(
slug: string,
params?: { limit?: number },
) {
const sdk = getTags();
return sdk.tagControllerGetRelatedTags(slug, params);
}

export async function getTagAnalytics(id: string) {
const sdk = getTags();
return sdk.tagControllerGetTagAnalytics(id);
}

export async function followedTags(params?: { cursor?: string; limit?: number }) {
const sdk = getTags();
return sdk.userTagControllerListFollowedTags(params);
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

export async function followTag(id: string): Promise<void> {
const sdk = getTags();
await sdk.tagControllerFollowTag(id);
}

export async function unfollowTag(id: string): Promise<void> {
const sdk = getTags();
await sdk.tagControllerUnfollowTag(id);
}