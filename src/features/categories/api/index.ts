// Re-export from wrappers (wrappers use generated SDK)
export {
  listCategories,
  getCategoryBySlug,
  getCategory,
  getCategoriesRanked,
  getCategoriesTrending,
  getCategoryQuizzes,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/features/categories/services/categories.service';

export type { ListCategoriesParams } from '@/features/categories/services/categories.service';

// Admin functions (deprecated - use wrappers instead)
