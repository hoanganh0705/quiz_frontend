export { getCategories, getCategoryBySlug } from './categories'
export { getCategoriesServer, getCategoryBySlugServer } from './categories-server'

// Admin functions (deprecated - use wrappers instead)
export {
  getCategories as getCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
} from './categories-admin'
export type { ListCategoriesParams } from './categories-admin'
