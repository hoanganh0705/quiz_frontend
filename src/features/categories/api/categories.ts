/**
 * Categories API layer.
 *
 * @deprecated Use wrappers instead:
 * - import { listCategories, getCategoryBySlug, ... } from '@/features/categories/wrappers/category.wrapper'
 */

import {
  listCategories,
  getCategoryBySlug,
  type ListCategoriesParams,
} from '@/features/categories/wrappers/category.wrapper';

export { listCategories, getCategoryBySlug };
export type { ListCategoriesParams };

export async function getCategories(params?: ListCategoriesParams) {
  return listCategories(params);
}
