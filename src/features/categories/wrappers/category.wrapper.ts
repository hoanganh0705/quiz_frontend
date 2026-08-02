/**
 * Categories wrapper — wraps API calls with the custom API client.
 * Uses the generated SDK from orval.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source tickets: TKT-3.3.A2 (browse + detail surface) + TKT-3.9.A2
 *                 (follow / unfollow / me/followed surface added in
 *                 Story 3.9 — Batch A).
 *
 * The wrapper is the ONLY place the categories SDK is imported. Hooks
 * and components in `src/features/categories/**` import from
 * `@/features/categories` (this barrel); they MUST NOT import from
 * `@/lib/api/generated/categories/categories` directly. This is the
 * cross-story contract rule #1 (no direct axios calls / SDK imports
 * outside `src/lib/api/**` and the wrapper).
 *
 * ## Drift notes (TKT-3.9.A1 §1.2)
 *
 * The `me/followed` endpoint (`GET /api/v1/users/me/followed-categories`)
 * is exported by `getUsers()` as `userCategoryControllerListFollowedCategories`
 * — NOT by `getCategories()`. The planning doc places it on
 * `getCategories()`. The wrapper calls `getUsers()` so the drift is
 * invisible to feature hooks. The public surface is
 * `followedCategories(params)` (camelCase; planning-intent).
 */

import { getCategories } from '@/lib/api/generated/categories/categories';
import { getUsers } from '@/lib/api/generated/users/users';
import type {
  CategoryControllerGetCategoryQuizzesParams,
  CreateCategoryDto,
  RankedCategoryResponseDto,
  UpdateCategoryDto,
} from '@/lib/api/generated/schemas';

export type {
  CategoryControllerListCategoriesResult,
  CategoryControllerCreateCategoryResult,
  CategoryControllerGetCategoryBySlugResult,
  CategoryControllerUpdateCategoryResult,
  CategoryControllerDeleteCategoryResult,
  CategoryControllerGetPopularCategoriesResult,
  CategoryControllerGetTrendingCategoriesResult,
  CategoryControllerGetCategoryQuizzesResult,
  CategoryControllerFollowCategoryResult,
  CategoryControllerUnfollowCategoryResult,
} from '@/lib/api/generated/categories/categories';

export type { UserCategoryControllerListFollowedCategoriesResult } from '@/lib/api/generated/users/users';

export interface ListCategoriesParams {
  cursor?: string;
  limit?: number;
}

/**
 * Cursor-paginated category directory.
 *
 * Wraps `getCategories().categoryControllerListCategories(params)`.
 * The SDK unwraps the `{ data, meta }` envelope at the interceptor
 * (`src/lib/api/core/custom-instance.ts` line 248); this function
 * returns the inner `WrappedPaginatedDto & { data, meta }` shape.
 */
export async function listCategories(params?: ListCategoriesParams) {
  const sdk = getCategories();
  return sdk.categoryControllerListCategories(params);
}

/**
 * Single-entity fetch by slug. The detail page's primary data source.
 *
 * Wraps `getCategories().categoryControllerGetCategoryBySlug(slug)`.
 * Returns the inner `WrappedDto & { data?: CategoryResponseDto }` shape.
 *
 * The SDK only exposes the slug variant; the planning doc's `:id`
 * variant does not exist on the wire (Epic 3.3 A1 §2 records the
 * drift).
 */
export async function getCategoryBySlug(slug: string) {
  const sdk = getCategories();
  return sdk.categoryControllerGetCategoryBySlug(slug);
}

/**
 * Non-paginated top list of popular categories.
 *
 * Wraps `getCategories().categoryControllerGetPopularCategories(params)`.
 * Returns `WrappedDto & { data?: RankedCategoryResponseDto[] }`.
 *
 * Naming note: the planning doc called this "ranked" (PHASE_3_EPICS.md
 * lines 289, 297); the backend path is `/categories/popular`. The
 * function is named `getCategoriesRanked` to preserve the planning
 * intent while the underlying SDK call targets `/popular` (Epic 3.3
 * A1 §2 records the drift).
 */
export async function getCategoriesRanked(params?: {
  limit?: number;
}): Promise<{ data?: RankedCategoryResponseDto[] }> {
  const sdk = getCategories();
  return sdk.categoryControllerGetPopularCategories(params);
}

/**
 * Non-paginated top list of trending categories.
 *
 * Wraps `getCategories().categoryControllerGetTrendingCategories(params)`.
 * Returns `WrappedDto & { data?: RankedCategoryResponseDto[] }`.
 */
export async function getCategoriesTrending(params?: {
  limit?: number;
}): Promise<{ data?: RankedCategoryResponseDto[] }> {
  const sdk = getCategories();
  return sdk.categoryControllerGetTrendingCategories(params);
}

/**
 * Cursor-paginated list of quizzes in a category.
 *
 * Wraps `getCategories().categoryControllerGetCategoryQuizzes(slug, params)`.
 * Returns `WrappedPaginatedDto & { data?: QuizListItemDto[]; meta?: { pagination?: PaginationMetaDto } }`.
 *
 * The fetcher adapter inside `useCategoryQuizzes` (Epic 3.3 B4) is
 * the only place this function reads `pagination.nextCursor`; the
 * hook itself never touches cursor state.
 */
export async function getCategoryQuizzes(
  slug: string,
  params?: CategoryControllerGetCategoryQuizzesParams,
) {
  const sdk = getCategories();
  return sdk.categoryControllerGetCategoryQuizzes(slug, params);
}

/**
 * Single-entity fetch by slug. Alias of `getCategoryBySlug` for the
 * hook layer's preferred naming — the hook (`useCategory`) calls
 * `getCategory` so the page code reads naturally.
 *
 * @deprecated Prefer `getCategoryBySlug` for new code; this alias
 * exists for hook-side readability only.
 */
export const getCategory = getCategoryBySlug;

export async function createCategory(params: CreateCategoryDto) {
  const sdk = getCategories();
  return sdk.categoryControllerCreateCategory(params);
}

export async function updateCategory(id: string, params: UpdateCategoryDto) {
  const sdk = getCategories();
  return sdk.categoryControllerUpdateCategory(id, params);
}

export async function deleteCategory(id: string) {
  const sdk = getCategories();
  return sdk.categoryControllerDeleteCategory(id);
}

/**
 * Follow a category. POST `/api/v1/categories/:id/follow`.
 *
 * Wraps `getCategories().categoryControllerFollowCategory(id)` and
 * returns `Promise<void>` (the backend returns 204 No Content).
 *
 * Source epic: Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.A2.
 *
 * Thin pass-through — no business logic, no error wrapping, no SWR
 * cache invalidation (the per-feature hook `useFollowCategory` /
 * `useUnfollowCategory` in B4 owns cache invalidation through the
 * `useOptimisticToggle` primitive, B1).
 *
 * Drift (TKT-3.9.A1 §1.1): the planning doc named this operation
 * `categoriesControllerFollowCategory` (plural prefix); the SDK uses
 * singular `categoryControllerFollowCategory`. The wrapper preserves
 * the singular naming to match the wire.
 */
export async function followCategory(id: string): Promise<void> {
  const sdk = getCategories();
  await sdk.categoryControllerFollowCategory(id);
}

/**
 * Unfollow a category. DELETE `/api/v1/categories/:id/follow`.
 *
 * Wraps `getCategories().categoryControllerUnfollowCategory(id)` and
 * returns `Promise<void>` (the backend returns 204 No Content).
 *
 * Source epic: Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.A2.
 *
 * Thin pass-through — same constraints as `followCategory`.
 *
 * Drift (TKT-3.9.A1 §1.1): the planning doc named this operation
 * `categoriesControllerUnfollowCategory` (plural prefix); the SDK
 * uses singular `categoryControllerUnfollowCategory`.
 */
export async function unfollowCategory(id: string): Promise<void> {
  const sdk = getCategories();
  await sdk.categoryControllerUnfollowCategory(id);
}

/**
 * Cursor-paginated list of categories the authenticated user follows.
 *
 * Wraps `getUsers().userCategoryControllerListFollowedCategories(params)`
 * and returns the post-`unwrap` envelope:
 *
 * ```
 * {
 *   data?: FollowedCategoryItemDto[]
 *   meta?: {
 *     pagination?: {
 *       nextCursor?: string | null
 *       hasNextPage?: boolean
 *     }
 *   }
 * }
 * ```
 *
 * Source epic: Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.A2.
 *
 * Drift (TKT-3.9.A1 §1.2): the planning doc placed this operation on
 * `getCategories()` as `categoriesControllerGetMyFollowedCategories(params)`.
 * The regenerated SDK places it on `getUsers()` as
 * `userCategoryControllerListFollowedCategories(params)`. The wrapper
 * calls `getUsers()` so the drift is invisible to feature hooks; the
 * planning-intent public name (`followedCategories`) is preserved.
 */
export async function followedCategories(
  params?: { cursor?: string; limit?: number },
) {
  const sdk = getUsers();
  return sdk.userCategoryControllerListFollowedCategories(params);
}
