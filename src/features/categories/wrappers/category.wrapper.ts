/**
 * Categories wrapper — wraps API calls with the custom API client.
 * Uses the generated SDK from orval.
 */

import { getCategories } from '@/lib/api/generated/categories/categories';
import type {
  CreateCategoryDto,
  UpdateCategoryDto,
} from '@/lib/api/generated/schemas';

export type {
  CategoryControllerListCategoriesResult,
  CategoryControllerCreateCategoryResult,
  CategoryControllerGetCategoryBySlugResult,
  CategoryControllerUpdateCategoryResult,
  CategoryControllerDeleteCategoryResult,
} from '@/lib/api/generated/categories/categories';

export interface ListCategoriesParams {
  cursor?: string
  limit?: number
}

export async function listCategories(params?: ListCategoriesParams) {
  const sdk = getCategories();
  return sdk.categoryControllerListCategories(params);
}

export async function getCategoryBySlug(slug: string) {
  const sdk = getCategories();
  return sdk.categoryControllerGetCategoryBySlug(slug);
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
