/**
 * Tags wrapper — wraps API calls with the custom API client.
 * Uses the generated SDK from orval.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.A2.
 *
 * The wrapper is the ONLY place the tags SDK is imported. Hooks
 * and components in `src/features/tags/**` import from
 * `@/features/tags` (this barrel); they MUST NOT import from
 * `@/lib/api/generated/tags/tags` directly. This is the
 * cross-story contract rule #1 (no direct axios calls / SDK imports
 * outside `src/lib/api/**` and the wrapper).
 *
 * ## Drift notes (TKT-3.4.A1)
 *
 * - `/tags/{slug}/quizzes` is the SDK's `tagControllerGetTagQuizzes(slug)`
 *   — the SDK does NOT accept a params argument, so the backend's
 *   default page size is applied. `getTagQuizzes(slug, params)` keeps
 *   the `params` argument for hook-side symmetry, but the underlying
 *   SDK call drops the `limit` and only honours the `cursor`.
 * - `/tags/{slug}/related` is the SDK's `tagControllerGetRelatedTags(slug, params)`
 *   — the planning doc called this `:id` related; the SDK uses `slug`.
 *   The wrapper accepts the canonical `slug` as the first arg.
 * - `/tags/{id}/analytics` is the SDK's `tagControllerGetTagAnalytics(id)`
 *   — wired by `id` (UUIDv7), matching the planning doc.
 * - `/tags/popular` and `/tags/trending` are non-paginated
 *   (limit-bounded) — the SDK returns `RankedTagResponseDto[]` (no
 *   `meta.pagination`).
 */

import { getTags } from '@/lib/api/generated/tags/tags'
import { orvalCustomInstance } from '@/lib/api/core/custom-instance';
import type { CreateTagDto, UpdateTagDto } from '@/lib/api/generated/schemas';

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
} from '@/lib/api/generated/tags/tags';

export interface ListTagsParams {
  cursor?: string;
  limit?: number;
}

export async function listTags(params?: ListTagsParams) {
  const sdk = getTags();
  return sdk.tagControllerListTags(params);
}

export async function getTagBySlug(slug: string) {
  const sdk = getTags();
  return sdk.tagControllerGetTagBySlug(slug);
}

/**
 * Alias of `getTagBySlug` for hook-side readability. The detail
 * page's `useTagBySlug` hook reads naturally with `getTag(slug)`.
 *
 * Kept consistent with the existing pattern in `category.wrapper.ts`
 * (`getCategory = getCategoryBySlug`).
 */
export const getTag = getTagBySlug;

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

/**
 * Non-paginated top list of popular tags.
 *
 * Wraps `getTags().tagControllerGetPopularTags(params)`. Returns
 * `WrappedDto & { data?: RankedTagResponseDto[] }`. The `limit`
 * parameter is bounded (1–100) per the OpenAPI spec.
 */
export async function getTagsPopular(params?: { limit?: number }) {
  const sdk = getTags();
  return sdk.tagControllerGetPopularTags(params);
}

/**
 * Non-paginated top list of trending tags.
 *
 * Wraps `getTags().tagControllerGetTrendingTags(params)`. Returns
 * `WrappedDto & { data?: RankedTagResponseDto[] }`. The `limit`
 * parameter is bounded (1–100) per the OpenAPI spec.
 */
export async function getTagsTrending(params?: { limit?: number }) {
  const sdk = getTags();
  return sdk.tagControllerGetTrendingTags(params);
}

/**
 * Cursor-paginated list of quizzes in a tag.
 *
 * Wraps a low-level `GET /api/v1/tags/{slug}/quizzes?cursor=...&limit=...`
 * call via `orvalCustomInstance` (the same custom-instance the SDK
 * uses). The orval-generated `tagControllerGetTagQuizzes(slug)` does
 * NOT accept a params argument, so the backend's default page size
 * would apply and the cursor would be dropped. By calling the
 * instance directly we keep the cursor + limit envelope on the wire
 * (the backend already supports it — Epic 3.2 A1 §2 confirmed the
 * pagination-meta shape is `PaginationMetaDto`).
 *
 * Returns `WrappedPaginatedDto & { data?: QuizListResponseDto[];
 *   meta?: { pagination?: PaginationMetaDto } }`.
 *
 * The fetcher adapter inside `useTagQuizzes` (TKT-3.4.B4) is the
 * only place this function reads `pagination.nextCursor`; the hook
 * itself never touches cursor state.
 */
export async function getTagQuizzes(
  slug: string,
  params?: { cursor?: string; limit?: number },
) {
  const queryParams: Record<string, unknown> = {}
  if (params?.cursor !== undefined) {
    queryParams.cursor = params.cursor
  }
  if (params?.limit !== undefined) {
    queryParams.limit = params.limit
  }
  return orvalCustomInstance<TagQuizzesResponse>({
    url: `/api/v1/tags/${slug}/quizzes`,
    method: 'GET',
    params: queryParams,
  })
}

/**
 * Non-paginated list of tags related to a tag.
 *
 * Wraps `getTags().tagControllerGetRelatedTags(slug, params)`.
 * Returns `WrappedDto & { data?: TagResponseDto[] }`. The `limit`
 * parameter is bounded (1–100) per the OpenAPI spec.
 *
 * Drift (TKT-3.4.A1 §2): the planning doc listed `/tags/:id/related`;
 * the actual SDK call takes `slug` (not `id`). The wrapper's
 * signature mirrors the SDK.
 */
export async function getRelatedTags(
  slug: string,
  params?: { limit?: number },
) {
  const sdk = getTags();
  return sdk.tagControllerGetRelatedTags(slug, params);
}

/**
 * Analytics for a single tag.
 *
 * Wraps `getTags().tagControllerGetTagAnalytics(id)`. Returns
 * `WrappedDto & { data?: TagAnalyticsResponseDto }`. The endpoint
 * may return 404 (a fresh tag with no activity); the hook in
 * `useTagAnalytics` treats that as the documented zero-state
 * (`analytics: null`, `error: null`) per Story 3.4 line 461.
 */
export async function getTagAnalytics(id: string) {
  const sdk = getTags();
  return sdk.tagControllerGetTagAnalytics(id);
}
