// Re-export from wrappers (wrappers use generated SDK)
export {
  listCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/features/categories/wrappers/category.wrapper';

export type { ListCategoriesParams } from '@/features/categories/wrappers/category.wrapper';

// Admin functions (deprecated - use wrappers instead)
