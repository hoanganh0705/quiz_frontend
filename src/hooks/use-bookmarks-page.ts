'use client'

import { useState, useMemo, useCallback } from 'react'
import { useBookmarks, useBookmarkedQuizzes } from '@/hooks/use-bookmarks'
import { quizzes } from '@/constants/mockQuizzes'
import type {
  BookmarkFilter,
  BookmarkSortOption,
  BookmarkCollection,
  BookmarkedQuiz
} from '@/types/bookmarks'
import type { Quiz } from '@/types/quiz'

const DIFFICULTY_MAP: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard'
}

const DIFFICULTY_ORDER = { Easy: 1, Medium: 2, Hard: 3 } as const
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export function useBookmarksPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<BookmarkFilter>('all')
  const [sortBy, setSortBy] = useState<BookmarkSortOption>('newest')
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null
  )
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeTab, setActiveTab] = useState<'all' | 'collections'>('all')

  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false)
  const [editingCollection, setEditingCollection] =
    useState<BookmarkCollection | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(
    null
  )

  const {
    removeBookmark,
    moveToCollection,
    addCollection,
    updateCollection,
    deleteCollection
  } = useBookmarks()

  const {
    bookmarkedQuizzes,
    quizzesByCollection,
    collections,
    getCollectionCounts,
    totalBookmarks
  } = useBookmarkedQuizzes(quizzes)

  const filteredQuizzes = useMemo(() => {
    let result: (Quiz & { bookmark: BookmarkedQuiz })[] = []

    if (activeTab === 'collections' && selectedCollection) {
      result = quizzesByCollection[selectedCollection] || []
    } else {
      result = [...bookmarkedQuizzes]
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (quiz) =>
          quiz.title.toLowerCase().includes(query) ||
          quiz.categories?.some((category) =>
            category.toLowerCase().includes(query)
          ) ||
          quiz.tags?.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    if (filter !== 'all' && filter !== 'recent') {
      result = result.filter(
        (quiz) => quiz.difficulty === DIFFICULTY_MAP[filter]
      )
    }

    if (filter === 'recent') {
      const cutoffTime = Date.now() - SEVEN_DAYS_MS
      result = result.filter(
        (quiz) => new Date(quiz.bookmark.bookmarkedAt).getTime() >= cutoffTime
      )
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return (
            new Date(b.bookmark.bookmarkedAt).getTime() -
            new Date(a.bookmark.bookmarkedAt).getTime()
          )
        case 'oldest':
          return (
            new Date(a.bookmark.bookmarkedAt).getTime() -
            new Date(b.bookmark.bookmarkedAt).getTime()
          )
        case 'name-asc':
          return a.title.localeCompare(b.title)
        case 'name-desc':
          return b.title.localeCompare(a.title)
        case 'difficulty':
          return (
            (DIFFICULTY_ORDER[a.difficulty as keyof typeof DIFFICULTY_ORDER] ||
              0) -
            (DIFFICULTY_ORDER[b.difficulty as keyof typeof DIFFICULTY_ORDER] ||
              0)
          )
        default:
          return 0
      }
    })

    return result
  }, [
    activeTab,
    selectedCollection,
    quizzesByCollection,
    bookmarkedQuizzes,
    searchQuery,
    filter,
    sortBy
  ])

  const handleCreateCollection = useCallback(
    (name: string, description: string, color: string) => {
      addCollection(name, description, color)
    },
    [addCollection]
  )

  const handleEditCollection = useCallback(
    (name: string, description: string, color: string) => {
      if (!editingCollection) return
      updateCollection(editingCollection.id, { name, description, color })
      setEditingCollection(null)
    },
    [editingCollection, updateCollection]
  )

  const handleDeleteCollection = useCallback(() => {
    if (!collectionToDelete) return
    deleteCollection(collectionToDelete)
    setCollectionToDelete(null)
    setDeleteDialogOpen(false)
    setSelectedCollection((prev) => (prev === collectionToDelete ? null : prev))
  }, [collectionToDelete, deleteCollection])

  const openEditDialog = useCallback((collection: BookmarkCollection) => {
    setEditingCollection(collection)
    setCollectionDialogOpen(true)
  }, [])

  const openDeleteDialog = useCallback((collectionId: string) => {
    setCollectionToDelete(collectionId)
    setDeleteDialogOpen(true)
  }, [])

  return {
    searchQuery,
    setSearchQuery,
    filter,
    setFilter,
    sortBy,
    setSortBy,
    selectedCollection,
    setSelectedCollection,
    viewMode,
    setViewMode,
    activeTab,
    setActiveTab,
    collectionDialogOpen,
    setCollectionDialogOpen,
    editingCollection,
    setEditingCollection,
    deleteDialogOpen,
    setDeleteDialogOpen,
    removeBookmark,
    moveToCollection,
    collections,
    getCollectionCounts,
    totalBookmarks,
    filteredQuizzes,
    handleCreateCollection,
    handleEditCollection,
    handleDeleteCollection,
    openEditDialog,
    openDeleteDialog
  }
}
