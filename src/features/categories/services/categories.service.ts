import { getCategories, getUsers } from "@/lib/api";

import type { CategoryControllerGetCategoryQuizzesParams } from "@/lib/api/generated/schemas";

export type {
  CategoryControllerListCategoriesResult,
  CategoryControllerGetCategoryBySlugResult,
  CategoryControllerGetPopularCategoriesResult,
  CategoryControllerGetTrendingCategoriesResult,
  CategoryControllerGetCategoryQuizzesResult,
  CategoryControllerFollowCategoryResult,
  CategoryControllerUnfollowCategoryResult,
} from "@/lib/api/generated/categories/categories";

export type { UserCategoryControllerListFollowedCategoriesResult } from "@/lib/api/generated/users/users";

export interface ListCategoriesParams {
  cursor?: string;
  limit?: number;
}

export async function listCategories(params?: ListCategoriesParams) {
  const sdk = getCategories();
  return sdk.categoryControllerListCategories(params);
}

export async function getCategoryBySlug(slug: string) {
  const sdk = getCategories();
  return sdk.categoryControllerGetCategoryBySlug(slug);
}

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

export async function followedCategories(params?: {
  cursor?: string;
  limit?: number;
}) {
  const sdk = getUsers();
  return sdk.userCategoryControllerListFollowedCategories(params);
}

export async function followCategory(id: string): Promise<void> {
  const sdk = getCategories();
  await sdk.categoryControllerFollowCategory(id);
}

export async function unfollowCategory(id: string): Promise<void> {
  const sdk = getCategories();
  await sdk.categoryControllerUnfollowCategory(id);
}
