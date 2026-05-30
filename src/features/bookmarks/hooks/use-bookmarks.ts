'use client'

import { useCallback, useMemo, useEffect, useState } from 'react'
import { useLocalStorage } from '@/shared/hooks/use-local-storage'
import {
  listCollections,
  createCollection as apiCreateCollection,
  updateCollection as apiUpdateCollection,
  deleteCollection as apiDeleteCollection,
  addBookmark as apiAddBookmark,
  removeBookmark as apiRemoveBookmark,
} from '@/features/bookmarks/api'
import type {
  BookmarkCollectionResponseDto,
  BookmarkedQuizResponseDto,
} from '@/lib/api/generated/schemas'

interface BookmarksState {
  collections: BookmarkCollectionResponseDto[]
  bookmarks: BookmarkedQuizResponseDto[]
}

const INITIAL_STATE: BookmarksState = {
  collections: [],
  bookmarks: []
}

export function useBookmarks() {
  const [state, setState] = useLocalStorage<BookmarksState>(
    'quiz_bookmarks',
    INITIAL_STATE
  )
  const [loading, setLoading] = useState(false)

  // Sync with server on mount
  useEffect(() => {
    const syncWithServer = async () => {
      try {
        setLoading(true)
        const collectionsData = await listCollections({ limit: 100 })
        setState({
          collections: collectionsData.items,
          bookmarks: [] // Bookmarks are fetched per collection
        })
      } catch {
        // Use local state if server is unavailable
      } finally {
        setLoading(false)
      }
    }

    syncWithServer()
  }, [setState])

  // Check if a quiz is bookmarked
  const isBookmarked = useCallback(
    (quizId: string) => {
      return state.bookmarks.some((b) => b.quiz?.quizId === quizId)
    },
    [state.bookmarks]
  )

  // Get bookmark info for a quiz
  const getBookmark = useCallback(
    (quizId: string) => {
      return state.bookmarks.find((b) => b.quiz?.quizId === quizId)
    },
    [state.bookmarks]
  )

  // Add a bookmark (optimistic update + server sync)
  const addBookmark = useCallback(
    async (quizId: string, collectionId: string | null = null) => {
      const tempId = `temp-${Date.now()}`
      const tempBookmark: BookmarkedQuizResponseDto = {
        bookmarkId: tempId,
        quizId,
        collectionId,
        bookmarkedAt: new Date().toISOString(),
      } as BookmarkedQuizResponseDto

      // Optimistic update
      setState((prev) => ({
        ...prev,
        bookmarks: [...prev.bookmarks, tempBookmark]
      }))

      // Sync with server
      try {
        const serverBookmark = collectionId
          ? await apiAddBookmark(collectionId, { quizId })
          : await apiAddBookmark('default', { quizId })

        // Update with real bookmark
        setState((prev) => ({
          ...prev,
          bookmarks: prev.bookmarks.map((b) =>
            b.bookmarkId === tempId ? serverBookmark : b
          )
        }))
      } catch {
        // Revert on failure
        setState((prev) => ({
          ...prev,
          bookmarks: prev.bookmarks.filter((b) => b.bookmarkId !== tempId)
        }))
      }
    },
    [setState]
  )

  // Remove a bookmark (optimistic update + server sync)
  const removeBookmark = useCallback(
    async (quizId: string) => {
      const bookmark = state.bookmarks.find((b) => b.quiz?.quizId === quizId)
      const collectionId = bookmark?.collection?.collectionId ?? 'default'

      // Optimistic update
      setState((prev) => ({
        ...prev,
        bookmarks: prev.bookmarks.filter((b) => b.quiz?.quizId !== quizId)
      }))

      // Sync with server
      try {
        await apiRemoveBookmark(collectionId, quizId)
      } catch {
        // Revert on failure - add bookmark back
        setState((prev) => ({
          ...prev,
          bookmarks: [...prev.bookmarks, bookmark!]
        }))
      }
    },
    [state.bookmarks, setState]
  )

  // Toggle bookmark
  const toggleBookmark = useCallback(
    async (quizId: string, collectionId: string | null = null) => {
      if (isBookmarked(quizId)) {
        await removeBookmark(quizId)
      } else {
        await addBookmark(quizId, collectionId)
      }
    },
    [isBookmarked, addBookmark, removeBookmark]
  )

  // Add a new collection (optimistic update + server sync)
  const addCollection = useCallback(
    async (
      name: string,
      description?: string,
      color: string = '#6b7280'
    ) => {
      const tempId = `temp-${Date.now()}`
      const tempCollection: BookmarkCollectionResponseDto = {
        collectionId: tempId,
        name,
        description,
        color,
        createdAt: new Date().toISOString(),
        quizCount: 0,
      } as BookmarkCollectionResponseDto

      // Optimistic update
      setState((prev) => ({
        ...prev,
        collections: [...prev.collections, tempCollection]
      }))

      // Sync with server
      try {
        const serverCollection = await apiCreateCollection({
          name,
          description,
          color
        })

        // Update temp ID with real server ID
        setState((prev) => ({
          ...prev,
          collections: prev.collections.map((c) =>
            c.collectionId === tempId ? serverCollection : c
          )
        }))

        return serverCollection.collectionId
      } catch {
        // Revert on failure
        setState((prev) => ({
          ...prev,
          collections: prev.collections.filter((c) => c.collectionId !== tempId)
        }))
        return null
      }
    },
    [setState]
  )

  // Update a collection (optimistic update + server sync)
  const updateCollection = useCallback(
    async (
      collectionId: string,
      updates: { name?: string; description?: string; color?: string }
    ) => {
      const previousCollections = state.collections

      // Optimistic update
      setState((prev) => ({
        ...prev,
        collections: prev.collections.map((c) =>
          c.collectionId === collectionId ? { ...c, ...updates } : c
        )
      }))

      // Sync with server
      try {
        await apiUpdateCollection(collectionId, updates)
      } catch {
        // Revert on failure
        setState({ ...state, collections: previousCollections })
      }
    },
    [state, setState]
  )

  // Delete a collection (optimistic update + server sync)
  const deleteCollection = useCallback(
    async (collectionId: string) => {
      const previousState = state

      // Optimistic update
      setState((prev) => ({
        collections: prev.collections.filter((c) => c.collectionId !== collectionId),
        bookmarks: prev.bookmarks.map((b) =>
          b.collection?.collectionId === collectionId
            ? { ...b, collection: undefined }
            : b
        )
      }))

      // Sync with server
      try {
        await apiDeleteCollection(collectionId)
      } catch {
        // Revert on failure
        setState(previousState)
      }
    },
    [state, setState]
  )

  // Get bookmarks by collection
  const getBookmarksByCollection = useCallback(
    (collectionId: string | null) => {
      return state.bookmarks.filter((b) => b.collection?.collectionId === collectionId)
    },
    [state.bookmarks]
  )

  // Get collection by ID
  const getCollection = useCallback(
    (collectionId: string) => {
      return state.collections.find((c) => c.collectionId === collectionId)
    },
    [state.collections]
  )

  // Get bookmarks count by collection
  const getCollectionCounts = useMemo(() => {
    const counts: Record<string, number> = { uncategorized: 0 }

    state.collections.forEach((c) => {
      counts[c.collectionId] = 0
    })

    state.bookmarks.forEach((b) => {
      const key = b.collection?.collectionId ?? 'uncategorized'
      if (counts[key] !== undefined) {
        counts[key]++
      }
    })

    return counts
  }, [state.bookmarks, state.collections])

  return {
    collections: state.collections,
    bookmarks: state.bookmarks,
    isBookmarked,
    getBookmark,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    addCollection,
    updateCollection,
    deleteCollection,
    getBookmarksByCollection,
    getCollection,
    getCollectionCounts,
    loading,
  }
}
