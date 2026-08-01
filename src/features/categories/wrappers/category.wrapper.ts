/**
 * Categories wrapper — wraps API calls with the custom API client.
 * Uses the generated SDK from orval.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source ticket: TKT-3.3.A2.
 *
 * The wrapper is the ONLY place the categories SDK is imported. Hooks
 * and components in `src/features/categories/**` import from
 * `@/features/categories` (this barrel); they MUST NOT import from
 * `@/lib/api/generated/categories/categories` directly. This is the
 * cross-story contract rule #1 (no direct axios calls / SDK imports
 * outside `src/lib/api/**` and the wrapper).
 */

import { getCategories } from '@/lib/api/generated/categories/categories';
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
} from '@/lib/api/generated/categories/categories';

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
