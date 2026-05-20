export interface BookmarkCollection {
  id: string
  name: string
  description?: string
  color: string
  createdAt: string
}

export interface BookmarkedQuiz {
  quizId: string
  collectionId: string | null
  bookmarkedAt: string
  notes?: string
}

export type BookmarkFilter = 'all' | 'recent' | 'easy' | 'medium' | 'hard'

export type BookmarkSortOption =
  | 'newest'
  | 'oldest'
  | 'name-asc'
  | 'name-desc'
  | 'difficulty'
