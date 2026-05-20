'use client'

import { useCallback, useMemo, useEffect } from 'react'
import { useLocalStorage } from '@/shared/hooks/use-local-storage'
import { Quiz } from '@/features/quizzes/types'
import type { BookmarkCollection, BookmarkedQuiz } from '@/features/bookmarks/types'
import {
  getBookmarks as fetchBookmarks,
  addBookmark as apiAddBookmark,
  removeBookmark as apiRemoveBookmark,
  updateBookmark as apiUpdateBookmark,
  createCollection as apiCreateCollection,
  updateCollection as apiUpdateCollection,
  deleteCollection as apiDeleteCollection,
  getCollections as fetchCollections
} from '@/features/bookmarks/api'

interface BookmarksState {
  collections: BookmarkCollection[]
  bookmarks: BookmarkedQuiz[]
}

const DEFAULT_COLLECTIONS: BookmarkCollection[] = [
  {
    id: 'favorites',
    name: 'Favorites',
    description: 'My favorite quizzes',
    color: '#ef4444',
    createdAt: new Date().toISOString()
  },
  {
    id: 'to-study',
    name: 'To Study',
    description: 'Quizzes I want to study later',
    color: '#3b82f6',
    createdAt: new Date().toISOString()
  },
  {
    id: 'completed',
    name: 'Completed',
    description: 'Quizzes I have completed',
    color: '#22c55e',
    createdAt: new Date().toISOString()
  }
]

const INITIAL_STATE: BookmarksState = {
  collections: DEFAULT_COLLECTIONS,
  bookmarks: []
}

export function useBookmarks() {
  const [state, setState] = useLocalStorage<BookmarksState>(
    'quiz_bookmarks',
    INITIAL_STATE
  )

  // Sync with server on mount (only once)
  useEffect(() => {
    const syncWithServer = async () => {
      try {
        const { bookmarks: serverBookmarks, collections: serverCollections } =
          await fetchBookmarks()

        if (serverBookmarks.length > 0 || serverCollections.length > 0) {
          setState({
            collections: serverCollections,
            bookmarks: serverBookmarks
          })
        }
      } catch {
        // Use local state if server is unavailable
      }
    }

    syncWithServer()
  }, [setState])

  // Check if a quiz is bookmarked
  const isBookmarked = useCallback(
    (quizId: string) => {
      return state.bookmarks.some((b) => b.quizId === quizId)
    },
    [state.bookmarks]
  )

  // Get bookmark info for a quiz
  const getBookmark = useCallback(
    (quizId: string) => {
      return state.bookmarks.find((b) => b.quizId === quizId)
    },
    [state.bookmarks]
  )

  // Add a bookmark (optimistic update + server sync)
  const addBookmark = useCallback(
    async (quizId: string, collectionId: string | null = null, notes?: string) => {
      // Optimistic update
      if (isBookmarked(quizId)) return

      const newBookmark: BookmarkedQuiz = {
        quizId,
        collectionId,
        bookmarkedAt: new Date().toISOString(),
        notes
      }

      setState((prev) => ({
        ...prev,
        bookmarks: [...prev.bookmarks, newBookmark]
      }))

      // Sync with server
      try {
        await apiAddBookmark({ quizId, collectionId, notes })
      } catch {
        // Revert on failure
        setState((prev) => ({
          ...prev,
          bookmarks: prev.bookmarks.filter((b) => b.quizId !== quizId)
        }))
      }
    },
    [isBookmarked, setState]
  )

  // Remove a bookmark (optimistic update + server sync)
  const removeBookmark = useCallback(
    async (quizId: string) => {
      const previousBookmarks = state.bookmarks

      // Optimistic update
      setState((prev) => ({
        ...prev,
        bookmarks: prev.bookmarks.filter((b) => b.quizId !== quizId)
      }))

      // Sync with server
      try {
        await apiRemoveBookmark(quizId)
      } catch {
        // Revert on failure
        setState({ ...state, bookmarks: previousBookmarks })
      }
    },
    [state, setState]
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

  // Move bookmark to a different collection (optimistic update + server sync)
  const moveToCollection = useCallback(
    async (quizId: string, collectionId: string | null) => {
      const previousBookmarks = state.bookmarks

      // Optimistic update
      setState((prev) => ({
        ...prev,
        bookmarks: prev.bookmarks.map((b) =>
          b.quizId === quizId ? { ...b, collectionId } : b
        )
      }))

      // Sync with server
      try {
        await apiUpdateBookmark(quizId, { collectionId })
      } catch {
        // Revert on failure
        setState({ ...state, bookmarks: previousBookmarks })
      }
    },
    [state, setState]
  )

  // Add a new collection (optimistic update + server sync)
  const addCollection = useCallback(
    async (
      name: string,
      description?: string,
      color: string = '#6b7280'
    ) => {
      const tempId = `temp-${Date.now()}`
      const newCollection: BookmarkCollection = {
        id: tempId,
        name,
        description,
        color,
        createdAt: new Date().toISOString()
      }

      // Optimistic update
      setState((prev) => ({
        ...prev,
        collections: [...prev.collections, newCollection]
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
            c.id === tempId
              ? { ...serverCollection }
              : c
          )
        }))

        return serverCollection.id
      } catch {
        // Revert on failure
        setState((prev) => ({
          ...prev,
          collections: prev.collections.filter((c) => c.id !== tempId)
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
      updates: Partial<Omit<BookmarkCollection, 'id' | 'createdAt'>>
    ) => {
      const previousCollections = state.collections

      // Optimistic update
      setState((prev) => ({
        ...prev,
        collections: prev.collections.map((c) =>
          c.id === collectionId ? { ...c, ...updates } : c
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
        collections: prev.collections.filter((c) => c.id !== collectionId),
        bookmarks: prev.bookmarks.map((b) =>
          b.collectionId === collectionId ? { ...b, collectionId: null } : b
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
      return state.bookmarks.filter((b) => b.collectionId === collectionId)
    },
    [state.bookmarks]
  )

  // Get collection by ID
  const getCollection = useCallback(
    (collectionId: string) => {
      return state.collections.find((c) => c.id === collectionId)
    },
    [state.collections]
  )

  // Get bookmarks count by collection (js-index-maps for O(1) lookups)
  const getCollectionCounts = useMemo(() => {
    const counts: Record<string, number> = { uncategorized: 0 }

    // Pre-initialize collection counts
    state.collections.forEach((c) => {
      counts[c.id] = 0
    })

    // Single iteration through bookmarks
    state.bookmarks.forEach((b) => {
      const key = b.collectionId ?? 'uncategorized'
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
    moveToCollection,
    addCollection,
    updateCollection,
    deleteCollection,
    getBookmarksByCollection,
    getCollection,
    getCollectionCounts
  }
}

// Helper hook to get full quiz data for bookmarks (js-index-maps for faster lookups)
export function useBookmarkedQuizzes(quizzes: Quiz[]) {
  const { bookmarks, collections, getCollectionCounts } = useBookmarks()

  // Create quiz lookup map for O(1) access (js-index-maps)
  const quizMap = useMemo(() => {
    const map = new Map<string, Quiz>()
    quizzes.forEach((quiz) => map.set(quiz.id, quiz))
    return map
  }, [quizzes])

  const bookmarkedQuizzes = useMemo(() => {
    return bookmarks
      .map((bookmark) => {
        const quiz = quizMap.get(bookmark.quizId)
        if (!quiz) return null
        return {
          ...quiz,
          bookmark
        }
      })
      .filter(Boolean) as (Quiz & { bookmark: BookmarkedQuiz })[]
  }, [bookmarks, quizMap])

  const quizzesByCollection = useMemo(() => {
    const grouped: Record<string, (Quiz & { bookmark: BookmarkedQuiz })[]> = {
      uncategorized: []
    }

    // Pre-initialize all collections
    collections.forEach((c) => {
      grouped[c.id] = []
    })

    // Single iteration to group
    bookmarkedQuizzes.forEach((quiz) => {
      const collectionId = quiz.bookmark.collectionId ?? 'uncategorized'
      if (grouped[collectionId]) {
        grouped[collectionId].push(quiz)
      }
    })

    return grouped
  }, [bookmarkedQuizzes, collections])

  return {
    bookmarkedQuizzes,
    quizzesByCollection,
    collections,
    getCollectionCounts,
    totalBookmarks: bookmarks.length
  }
}
