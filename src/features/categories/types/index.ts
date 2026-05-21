// Categories types — aligned with backend CategoryResponseDto
export interface Category {
  categoryId: string
  name: string
  description: string | null
  slug: string
  imageUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface CategoryListResponse {
  items: Category[]
  pagination: {
    limit: number
    nextCursor: string | null
    hasNextPage: boolean
  }
}

export interface DeleteCategoryResponse {
  message: string
}

// Legacy alias for backward compatibility with existing component props
export type QuizCategory = Category
