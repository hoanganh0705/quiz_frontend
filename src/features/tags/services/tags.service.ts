import { ApiError, getTags } from "@/lib/api";
import { isValidSlug } from "@/lib/forms/regex";

import type { TagQuizzesResponse } from "@/features/tags/types";
import type { TagControllerGetTagBySlug200 } from "@/lib/api/generated/schemas";

export type {
  TagControllerListTagsResult,
  TagControllerGetTagBySlugResult,
  TagControllerGetTagsBySlugsResult,
  TagControllerGetPopularTagsResult,
  TagControllerGetTrendingTagsResult,
  TagControllerGetTagQuizzesResult,
  TagControllerGetRelatedTagsResult,
  TagControllerGetTagAnalyticsResult,
  TagControllerGetTagByIdResult,
  TagControllerFollowTagResult,
  TagControllerUnfollowTagResult,
  UserTagControllerListFollowedTagsResult,
} from "@/lib/api/generated/tags/tags";

const UUID_V7_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createTagNotFoundError(slugOrId: string): ApiError {
  return ApiError.fromInput({
    status: 404,
    code: "TAG_NOT_FOUND",
    title: "NotFound",
    message: `Tag "${slugOrId}" not found.`,
    instance: `/api/v1/tags/${encodeURIComponent(slugOrId)}`,
  });
}

export interface ListTagsParams {
  cursor?: string;
  limit?: number;
  signal?: AbortSignal;
}

export async function listTags(params?: ListTagsParams) {
  const sdk = getTags();
  const forwarded: Parameters<typeof sdk.tagControllerListTags>[0] = {};
  if (params?.cursor !== undefined) forwarded.cursor = params.cursor;
  if (params?.limit !== undefined) forwarded.limit = params.limit;
  return sdk.tagControllerListTags(forwarded);
}

export async function getTagsBySlugs(slugs: readonly string[]) {
  const sdk = getTags();
  const joined = slugs
    .map((slug) => slug.trim().toLowerCase())
    .filter((slug) => slug.length > 0)
    .join(",");
  return sdk.tagControllerGetTagsBySlugs(
    joined.length > 0 ? { slugs: joined } : undefined,
  );
}

/**
 * Resolves a single tag by slug (or UUID v7 `tagId`).
 *
 * Note: On the backend `TagController`, `GET /api/v1/tags/:id` (with
 * `ParseUUIDPipe({ version: '7' })`) is registered ahead of
 * `GET /api/v1/tags/:slug`, which causes `GET /api/v1/tags/<slug>` to fail
 * with `400 Bad Request` whenever `<slug>` is not a UUID v7. Routing slug
 * lookups through `GET /api/v1/tags/by-slugs?slugs=<slug>` avoids the shadowed
 * wildcard route while preserving UUID v7 lookups via `GET /api/v1/tags/:id`.
 */
export async function getTagBySlug(
  slugOrId: string,
): Promise<TagControllerGetTagBySlug200> {
  const sdk = getTags();
  const trimmed = slugOrId.trim();

  if (UUID_V7_REGEX.test(trimmed)) {
    return sdk.tagControllerGetTagById(trimmed);
  }

  const normalized = trimmed.toLowerCase();
  if (!isValidSlug(normalized)) {
    throw createTagNotFoundError(slugOrId);
  }

  const response = await sdk.tagControllerGetTagsBySlugs({ slugs: normalized });
  const matched =
    (response.data ?? []).find(
      (item) => item.slug.toLowerCase() === normalized,
    ) ?? response.data?.[0];

  if (!matched) {
    throw createTagNotFoundError(slugOrId);
  }

  return {
    meta: response.meta,
    data: matched,
  } as unknown as TagControllerGetTagBySlug200;
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

export async function followedTags(params?: {
  cursor?: string;
  limit?: number;
}) {
  const sdk = getTags();
  return sdk.userTagControllerListFollowedTags(params);
}

export async function followTag(id: string): Promise<void> {
  const sdk = getTags();
  await sdk.tagControllerFollowTag(id);
}

export async function unfollowTag(id: string): Promise<void> {
  const sdk = getTags();
  await sdk.tagControllerUnfollowTag(id);
}
