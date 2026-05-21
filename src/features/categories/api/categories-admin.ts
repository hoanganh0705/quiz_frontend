import { apiClient } from '@/shared/lib/api/client'
import type { Category, CategoryListResponse, DeleteCategoryResponse } from '../types'

export async function getCategories(params?: {
  cursor?: string
  limit?: number
}): Promise<CategoryListResponse> {
  const response = await apiClient.get('/categories', { params })
  return response.data
}

export async function getCategoryBySlug(slug: string): Promise<Category> {
  const response = await apiClient.get(`/categories/${slug}`)
  return response.data
}

export async function createCategory(payload: {
  name: string
  description?: string
  slug?: string
  imageUrl?: string
}): Promise<Category> {
  const response = await apiClient.post('/categories', payload)
  return response.data
}

export async function updateCategory(
  id: string,
  payload: {
    name?: string
    description?: string
    slug?: string
    imageUrl?: string
  }
): Promise<Category> {
  const response = await apiClient.patch(`/categories/${id}`, payload)
  return response.data
}

export async function deleteCategory(id: string): Promise<DeleteCategoryResponse> {
  const response = await apiClient.delete(`/categories/${id}`)
  return response.data
}
