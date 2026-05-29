/**
 * Categories wrapper — wraps API calls with the custom API client.
 */

import { customInstance } from '@/lib/api/core/custom-instance';
import type {
  Category,
  CategoryListResponse,
} from '@/features/categories/types';

export interface ListCategoriesParams {
  cursor?: string
  limit?: number
}

export async function listCategories(
  params?: ListCategoriesParams
): Promise<CategoryListResponse> {
  const response = await customInstance.get<CategoryListResponse>(
    '/categories',
    { params }
  );
  return response.data;
}

export async function getCategoryBySlug(slug: string): Promise<Category> {
  const response = await customInstance.get<Category>(
    `/categories/${slug}`
  );
  return response.data;
}

// Admin-only functions (require authentication)
export interface CreateCategoryParams {
  name: string
  slug: string
  description?: string
  imageUrl?: string
}

export async function createCategory(params: CreateCategoryParams): Promise<Category> {
  const response = await customInstance.post<Category>(
    '/categories',
    params
  );
  return response.data;
}

export async function updateCategory(
  id: string,
  params: Partial<CreateCategoryParams>
): Promise<Category> {
  const response = await customInstance.patch<Category>(
    `/categories/${id}`,
    params
  );
  return response.data;
}

export async function deleteCategory(id: string): Promise<{ message: string }> {
  const response = await customInstance.delete<{ message: string }>(
    `/categories/${id}`
  );
  return response.data;
}
