/**
 * `categories.service.ts` — Categories service (Phase 3 + Phase 4 lanes).
 *
 * Source epic:   Epic 3.3 — Category browse + detail (read-only).
 *                 + Story 3.9 — Follow / unfollow (write paths).
 * Source ticket: TKT-4.1.G-prep.
 *
 * The single import surface for every categories SDK call. Replaces
 * `features/categories/wrappers/category.wrapper.ts` (TKT-3.3.A2 +
 * TKT-3.9.A2). Both read and write paths live here — categories is a
 * Phase 3 lane that has no Phase 4 additions, so the surface matches
 * the legacy wrapper one-for-one.
 *
 * ## Drift notes (TKT-3.9.A1)
 *
 * - `followedCategories(params)` calls `getUsers()` (the backend
 *   controller is on the users module) — NOT `getCategories()`.
 *   This is the only function whose SDK builder differs from the
 *   others in this file.
 */

import { getCategories, getUsers } from '@/lib/api';

import type {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryControllerGetCategoryQuizzesParams,
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

// ─── Reads ──────────────────────────────────────────────────────────────

export async function listCategories(params?: ListCategoriesParams) {
  const sdk = getCategories();
  return sdk.categoryControllerListCategories(params);
}

export async function getCategoryBySlug(slug: string) {
  const sdk = getCategories();
  return sdk.categoryControllerGetCategoryBySlug(slug);
}

/**
 * Alias of `getCategoryBySlug` for hook-side readability.
 */
export const getCategory = getCategoryBySlug;

export async function getCategoriesRanked(params?: { limit?: number }) {
  const sdk = getCategories();
  return sdk.categoryControllerGetPopularCategories(params);
}

export async function getCategoriesTrending(params?: { limit?: number }) {
  const sdk = getCategories();
  return sdk.categoryControllerGetTrendingCategories(params);
}

export async function getCategoryQuizzes(
  slug: string,
  params?: CategoryControllerGetCategoryQuizzesParams,
) {
  const sdk = getCategories();
  return sdk.categoryControllerGetCategoryQuizzes(slug, params);
}

/**
 * `followedCategories(params)` — on `getUsers()` (drift capture).
 */
export async function followedCategories(
  params?: { cursor?: string; limit?: number },
) {
  const sdk = getUsers();
  return sdk.userCategoryControllerListFollowedCategories(params);
}

// ─── Writes ─────────────────────────────────────────────────────────────

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

export async function followCategory(id: string): Promise<void> {
  const sdk = getCategories();
  await sdk.categoryControllerFollowCategory(id);
}

export async function unfollowCategory(id: string): Promise<void> {
  const sdk = getCategories();
  await sdk.categoryControllerUnfollowCategory(id);
}