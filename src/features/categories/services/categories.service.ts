

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

export async function followedCategories(
params?: { cursor?: string; limit?: number },
) {
const sdk = getUsers();
return sdk.userCategoryControllerListFollowedCategories(params);
}

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