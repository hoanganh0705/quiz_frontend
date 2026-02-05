'use client'

import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './use-local-storage'
import { Quiz } from '@/types/quiz'

export interface BookmarkCollection {
  id: string
  name: string
  description?: string
  color: string
  createdAt: string
}

export interface BookmarkedQuiz {
  quizId: string
  collectionId: string | null // null means "Uncategorized"
  bookmarkedAt: string
  notes?: string
}

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

  // Add a bookmark
  const addBookmark = useCallback(
    (quizId: string, collectionId: string | null = null, notes?: string) => {
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
    },
    [isBookmarked, setState]
  )

  // Remove a bookmark
  const removeBookmark = useCallback(
    (quizId: string) => {
      setState((prev) => ({
        ...prev,
        bookmarks: prev.bookmarks.filter((b) => b.quizId !== quizId)
      }))
    },
    [setState]
  )

  // Toggle bookmark
  const toggleBookmark = useCallback(
    (quizId: string, collectionId: string | null = null) => {
      if (isBookmarked(quizId)) {
        removeBookmark(quizId)
      } else {
        addBookmark(quizId, collectionId)
      }
    },
    [isBookmarked, addBookmark, removeBookmark]
  )

  // Move bookmark to a different collection
  const moveToCollection = useCallback(
    (quizId: string, collectionId: string | null) => {
      setState((prev) => ({
        ...prev,
        bookmarks: prev.bookmarks.map((b) =>
          b.quizId === quizId ? { ...b, collectionId } : b
        )
      }))
    },
    [setState]
  )

  // Add a new collection
  const addCollection = useCallback(
    (name: string, description?: string, color: string = '#6b7280') => {
      const newCollection: BookmarkCollection = {
        id: `collection-${Date.now()}`,
        name,
        description,
        color,
        createdAt: new Date().toISOString()
      }

      setState((prev) => ({
        ...prev,
        collections: [...prev.collections, newCollection]
      }))

      return newCollection.id
    },
    [setState]
  )

  // Update a collection
  const updateCollection = useCallback(
    (
      collectionId: string,
      updates: Partial<Omit<BookmarkCollection, 'id' | 'createdAt'>>
    ) => {
      setState((prev) => ({
        ...prev,
        collections: prev.collections.map((c) =>
          c.id === collectionId ? { ...c, ...updates } : c
        )
      }))
    },
    [setState]
  )

  // Delete a collection (moves bookmarks to uncategorized)
  const deleteCollection = useCallback(
    (collectionId: string) => {
      setState((prev) => ({
        collections: prev.collections.filter((c) => c.id !== collectionId),
        bookmarks: prev.bookmarks.map((b) =>
          b.collectionId === collectionId ? { ...b, collectionId: null } : b
        )
      }))
    },
    [setState]
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

    // Pre-initialize collection counts (js-early-exit)
    state.collections.forEach((c) => {
      counts[c.id] = 0
    })

    // Single iteration through bookmarks (js-combine-iterations)
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

    // Pre-initialize all collections (js-early-exit optimization)
    collections.forEach((c) => {
      grouped[c.id] = []
    })

    // Single iteration to group (js-combine-iterations)
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
