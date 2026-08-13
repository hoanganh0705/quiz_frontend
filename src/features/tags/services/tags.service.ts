/**
 * `tags.service.ts` — Tags service (Phase 3 + Phase 4 lanes).
 *
 * Source epic:   Epic 3.4 — Tag browse + detail (read-only).
 *                 + Story 3.9 — Follow / unfollow (write paths).
 * Source ticket: TKT-4.1.G-prep.
 *
 * Replaces `features/tags/wrappers/tag.wrapper.ts` (TKT-3.4.A2 +
 * TKT-3.9.A2). One-for-one migration of the legacy surface.
 *
 * ## Drift notes
 *
 * - `getTagQuizzes(slug, params)` uses `orvalCustomInstance` because
 *   the orval-generated `tagControllerGetTagQuizzes(slug)` does NOT
 *   accept a params argument; we need to forward `cursor` + `limit`
 *   for the hook's pagination contract.
 * - `followedTags(params)` lives on `getTags()` (the backend
 *   controller is in the tags module); the function name preserved.
 */

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
}

// ─── Reads ──────────────────────────────────────────────────────────────

export async function listTags(params?: ListTagsParams) {
  const sdk = getTags();
  return sdk.tagControllerListTags(params);
}

export async function getTagBySlug(slug: string) {
  const sdk = getTags();
  return sdk.tagControllerGetTagBySlug(slug);
}

/** Alias of `getTagBySlug` for hook-side readability. */
export const getTag = getTagBySlug;

export async function getTagsPopular(params?: { limit?: number }) {
  const sdk = getTags();
  return sdk.tagControllerGetPopularTags(params);
}

export async function getTagsTrending(params?: { limit?: number }) {
  const sdk = getTags();
  return sdk.tagControllerGetTrendingTags(params);
}

/**
 * `getTagQuizzes(slug, params)` — page through the quizzes in a tag.
 *
 * Phase 6: the orval SDK now exposes a typed `params` argument on
 * `tagControllerGetTagQuizzes` after the swagger decorator change
 * in `tag.controller.ts` documented `cursor` + `limit`. The
 * `orvalCustomInstance` workaround is gone — the SDK function
 * forwards through the canonical `customInstance` interceptor
 * and unwraps the envelope the same way.
 */
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

// ─── Writes ─────────────────────────────────────────────────────────────

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