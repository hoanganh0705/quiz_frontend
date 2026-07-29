/**
 * Categories Admin API - Re-exports from wrapper for admin compatibility
 * @deprecated Use wrappers instead: import { listCategories, createCategory, ... } from '@/features/categories/wrappers'
 */

import { listCategories, createCategory, updateCategory, deleteCategory } from '@/features/categories/wrappers/category.wrapper';
import type { CreateCategoryDto, UpdateCategoryDto } from '@/lib/api/generated/schemas';

export type { ListCategoriesParams } from '@/features/categories/wrappers/category.wrapper';

export interface Category {
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface GetCategoriesParams {
  cursor?: string;
  limit?: number;
}

// Re-export functions that work for both admin and non-admin use
export async function getCategoriesAdmin(params?: GetCategoriesParams) {
  return listCategories(params);
}

// Create a new category
export async function createCategoryAdmin(params: CreateCategoryDto) {
  return createCategory(params);
}

// Update an existing category
export async function updateCategoryAdmin(categoryId: string, params: UpdateCategoryDto) {
  return updateCategory(categoryId, params);
}

// Delete a category
export async function deleteCategoryAdmin(categoryId: string) {
  return deleteCategory(categoryId);
}
