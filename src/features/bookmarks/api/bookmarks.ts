import { apiClient } from '@/shared/lib/api/client'
import type { BookmarkCollection, BookmarkedQuiz } from '@/features/bookmarks/types'

export interface BookmarkResponse {
  id: string
  quizId: string
  collectionId: string | null
  bookmarkedAt: string
  notes?: string
}

export interface CollectionResponse {
  id: string
  name: string
  description?: string
  color: string
  createdAt: string
  quizCount?: number
}

export interface GetBookmarksResponse {
  bookmarks: BookmarkResponse[]
  collections: CollectionResponse[]
}

export interface CreateBookmarkRequest {
  quizId: string
  collectionId?: string | null
  notes?: string
}

export interface UpdateBookmarkRequest {
  collectionId?: string | null
  notes?: string
}

export interface CreateCollectionRequest {
  name: string
  description?: string
  color: string
}

export interface UpdateCollectionRequest {
  name?: string
  description?: string
  color?: string
}

// Get all bookmarks and collections
export async function getBookmarks() {
  const response = await apiClient.get<GetBookmarksResponse>('/bookmarks')
  return response.data
}

// Add a bookmark
export async function addBookmark(payload: CreateBookmarkRequest) {
  const response = await apiClient.post<BookmarkResponse>('/bookmarks', payload)
  return response.data
}

// Remove a bookmark
export async function removeBookmark(quizId: string) {
  await apiClient.delete(`/bookmarks/${quizId}`)
}

// Update a bookmark (move to collection, update notes)
export async function updateBookmark(quizId: string, payload: UpdateBookmarkRequest) {
  const response = await apiClient.patch<BookmarkResponse>(
    `/bookmarks/${quizId}`,
    payload
  )
  return response.data
}

// Get all collections
export async function getCollections() {
  const response = await apiClient.get<CollectionResponse[]>('/bookmarks/collections')
  return response.data
}

// Create a new collection
export async function createCollection(payload: CreateCollectionRequest) {
  const response = await apiClient.post<CollectionResponse>(
    '/bookmarks/collections',
    payload
  )
  return response.data
}

// Update a collection
export async function updateCollection(
  collectionId: string,
  payload: UpdateCollectionRequest
) {
  const response = await apiClient.patch<CollectionResponse>(
    `/bookmarks/collections/${collectionId}`,
    payload
  )
  return response.data
}

// Delete a collection (bookmarks are moved to uncategorized)
export async function deleteCollection(collectionId: string) {
  await apiClient.delete(`/bookmarks/collections/${collectionId}`)
}
