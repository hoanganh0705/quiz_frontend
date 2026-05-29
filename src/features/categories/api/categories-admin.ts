/**
 * Categories Admin API layer.
 *
 * @deprecated Use wrappers instead:
 * - import { listCategories, createCategory, ... } from '@/features/categories/wrappers/category.wrapper'
 */

import {
  listCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  type ListCategoriesParams,
} from '@/features/categories/wrappers/category.wrapper';

export {
  listCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
};
export type { ListCategoriesParams };

// Backward-compatible aliases
export async function getCategories(params?: ListCategoriesParams) {
  return listCategories(params);
}
