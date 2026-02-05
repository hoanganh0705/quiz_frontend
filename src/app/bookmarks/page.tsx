'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// Fix barrel imports (bundle-barrel-imports)
import { AlertDialog } from '@/components/ui/alert-dialog'
import { AlertDialogAction } from '@/components/ui/alert-dialog'
import { AlertDialogCancel } from '@/components/ui/alert-dialog'
import { AlertDialogContent } from '@/components/ui/alert-dialog'
import { AlertDialogDescription } from '@/components/ui/alert-dialog'
import { AlertDialogFooter } from '@/components/ui/alert-dialog'
import { AlertDialogHeader } from '@/components/ui/alert-dialog'
import { AlertDialogTitle } from '@/components/ui/alert-dialog'
// Import components directly (bundle-barrel-imports)
import BookmarkedQuizCard from '@/components/bookmarks/BookmarkedQuizCard'
import BookmarkFilters from '@/components/bookmarks/BookmarkFilters'
import CollectionCard from '@/components/bookmarks/CollectionCard'
import CollectionDialog from '@/components/bookmarks/CollectionDialog'
import EmptyBookmarks from '@/components/bookmarks/EmptyBookmarks'
import { useBookmarks, useBookmarkedQuizzes } from '@/hooks/use-bookmarks'
import { quizzes } from '@/constants/mockQuizzes'
import type {
  BookmarkFilter,
  BookmarkSortOption,
  BookmarkCollection
} from '@/types/bookmarks'
import type { Quiz } from '@/types/quiz'
import type { BookmarkedQuiz } from '@/hooks/use-bookmarks'
import { Bookmark, FolderPlus, Grid3X3, List, Layers } from 'lucide-react'

// Hoist static data outside component (rendering-hoist-jsx, js-hoist-regexp)
const DIFFICULTY_MAP: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard'
} as const

const DIFFICULTY_ORDER = { Easy: 1, Medium: 2, Hard: 3 } as const
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export default function BookmarksPage() {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<BookmarkFilter>('all')
  const [sortBy, setSortBy] = useState<BookmarkSortOption>('newest')
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null
  )
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeTab, setActiveTab] = useState<'all' | 'collections'>('all')

  // Collection dialog state
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false)
  const [editingCollection, setEditingCollection] =
    useState<BookmarkCollection | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(
    null
  )

  // Hooks
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

  // Cache expensive computations (js-cache-function-results)
  const filteredQuizzes = useMemo(() => {
    let result: (Quiz & { bookmark: BookmarkedQuiz })[] = []

    // Get quizzes based on selected collection or all
    if (activeTab === 'collections' && selectedCollection) {
      result = quizzesByCollection[selectedCollection] || []
    } else {
      result = [...bookmarkedQuizzes]
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (quiz) =>
          quiz.title.toLowerCase().includes(query) ||
          quiz.categories?.some((c) => c.toLowerCase().includes(query)) ||
          quiz.tags?.some((t) => t.toLowerCase().includes(query))
      )
    }

    // Apply difficulty filter
    if (filter !== 'all' && filter !== 'recent') {
      result = result.filter(
        (quiz) => quiz.difficulty === DIFFICULTY_MAP[filter]
      )
    }

    // Apply recent filter (last 7 days) - js-early-exit
    if (filter === 'recent') {
      const cutoffTime = Date.now() - SEVEN_DAYS_MS
      result = result.filter(
        (quiz) => new Date(quiz.bookmark.bookmarkedAt).getTime() >= cutoffTime
      )
    }

    // Apply sorting
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
        case 'difficulty': {
          return (
            (DIFFICULTY_ORDER[a.difficulty as keyof typeof DIFFICULTY_ORDER] ||
              0) -
            (DIFFICULTY_ORDER[b.difficulty as keyof typeof DIFFICULTY_ORDER] ||
              0)
          )
        }
        default:
          return 0
      }
    })

    return result
  }, [
    bookmarkedQuizzes,
    quizzesByCollection,
    selectedCollection,
    activeTab,
    searchQuery,
    filter,
    sortBy
  ])

  // Handlers
  const handleCreateCollection = useCallback(
    (name: string, description: string, color: string) => {
      addCollection(name, description, color)
    },
    [addCollection]
  )

  const handleEditCollection = useCallback(
    (name: string, description: string, color: string) => {
      if (editingCollection) {
        updateCollection(editingCollection.id, { name, description, color })
        setEditingCollection(null)
      }
    },
    [editingCollection, updateCollection]
  )

  // Use functional setState for stable callbacks (rerender-functional-setstate)
  const handleDeleteCollection = useCallback(() => {
    if (collectionToDelete) {
      deleteCollection(collectionToDelete)
      setCollectionToDelete(null)
      setDeleteDialogOpen(false)
      setSelectedCollection((prev) =>
        prev === collectionToDelete ? null : prev
      )
    }
  }, [collectionToDelete, deleteCollection])

  // Wrap in useCallback to prevent re-renders (rerender-memo)
  const openEditDialog = useCallback((collection: BookmarkCollection) => {
    setEditingCollection(collection)
    setCollectionDialogOpen(true)
  }, [])

  const openDeleteDialog = useCallback((collectionId: string) => {
    setCollectionToDelete(collectionId)
    setDeleteDialogOpen(true)
  }, [])

  return (
    <div className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'>
      {/* Header */}
      <div className='mb-8'>
        <div className='flex items-center gap-3 mb-2'>
          <Bookmark className='h-8 w-8 text-default' />
          <h1 className='text-3xl font-bold text-foreground'>Saved Quizzes</h1>
        </div>
        <p className='text-foreground/70 text-base'>
          {totalBookmarks > 0
            ? `You have ${totalBookmarks} bookmarked ${totalBookmarks === 1 ? 'quiz' : 'quizzes'}`
            : 'Bookmark quizzes to access them quickly'}
        </p>
      </div>

      {totalBookmarks === 0 ? (
        <EmptyBookmarks
          type='no-bookmarks'
          onCreateCollection={() => setCollectionDialogOpen(true)}
        />
      ) : (
        <>
          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'all' | 'collections')}
            className='mb-6'
          >
            <div className='flex items-center justify-between flex-wrap gap-4 mb-6'>
              <TabsList>
                <TabsTrigger value='all'>
                  <Bookmark className='mr-2 h-4 w-4' />
                  All Bookmarks
                </TabsTrigger>
                <TabsTrigger value='collections'>
                  <Layers className='mr-2 h-4 w-4' />
                  Collections
                </TabsTrigger>
              </TabsList>

              <div className='flex items-center gap-2'>
                {/* View Mode Toggle - Add aria-labels for accessibility */}
                <div
                  className='flex border rounded-md'
                  role='group'
                  aria-label='View mode selection'
                >
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size='sm'
                    onClick={() => setViewMode('grid')}
                    className={
                      viewMode === 'grid' ? 'bg-default text-white' : ''
                    }
                    aria-label='Grid view'
                    aria-pressed={viewMode === 'grid'}
                  >
                    <Grid3X3 className='h-4 w-4' aria-hidden='true' />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size='sm'
                    onClick={() => setViewMode('list')}
                    className={
                      viewMode === 'list' ? 'bg-default text-white' : ''
                    }
                    aria-label='List view'
                    aria-pressed={viewMode === 'list'}
                  >
                    <List className='h-4 w-4' aria-hidden='true' />
                  </Button>
                </div>

                {/* Create Collection Button */}
                <Button
                  onClick={() => {
                    setEditingCollection(null)
                    setCollectionDialogOpen(true)
                  }}
                  className='bg-default hover:bg-default-hover text-white'
                >
                  <FolderPlus className='mr-2 h-4 w-4' />
                  New Collection
                </Button>
              </div>
            </div>

            {/* All Bookmarks Tab */}
            <TabsContent value='all'>
              <BookmarkFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filter={filter}
                onFilterChange={setFilter}
                sortBy={sortBy}
                onSortChange={setSortBy}
              />

              {filteredQuizzes.length === 0 ? (
                <EmptyBookmarks type='no-results' />
              ) : (
                <div
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                      : 'flex flex-col gap-3'
                  }
                >
                  {filteredQuizzes.map((quiz) => (
                    <BookmarkedQuizCard
                      key={quiz.id}
                      quiz={quiz}
                      bookmark={quiz.bookmark}
                      collections={collections}
                      onRemove={removeBookmark}
                      onMoveToCollection={moveToCollection}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Collections Tab */}
            <TabsContent value='collections'>
              {/* Collections Grid */}
              <div className='mb-8'>
                <h3 className='text-lg font-semibold mb-4'>Your Collections</h3>
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
                  {/* Uncategorized */}
                  <CollectionCard
                    collection={{
                      id: 'uncategorized',
                      name: 'Uncategorized',
                      description: 'Bookmarks without a collection',
                      color: '#6b7280',
                      createdAt: ''
                    }}
                    count={getCollectionCounts['uncategorized'] || 0}
                    isSelected={selectedCollection === 'uncategorized'}
                    onSelect={() =>
                      setSelectedCollection(
                        selectedCollection === 'uncategorized'
                          ? null
                          : 'uncategorized'
                      )
                    }
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />

                  {/* User Collections */}
                  {collections.map((collection) => (
                    <CollectionCard
                      key={collection.id}
                      collection={collection}
                      count={getCollectionCounts[collection.id] || 0}
                      isSelected={selectedCollection === collection.id}
                      onSelect={() =>
                        setSelectedCollection(
                          selectedCollection === collection.id
                            ? null
                            : collection.id
                        )
                      }
                      onEdit={() => openEditDialog(collection)}
                      onDelete={() => openDeleteDialog(collection.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Selected Collection Quizzes */}
              {selectedCollection && (
                <div>
                  <h3 className='text-lg font-semibold mb-4'>
                    {selectedCollection === 'uncategorized'
                      ? 'Uncategorized Quizzes'
                      : `${collections.find((c) => c.id === selectedCollection)?.name} Quizzes`}
                  </h3>

                  <BookmarkFilters
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    filter={filter}
                    onFilterChange={setFilter}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                  />

                  {filteredQuizzes.length === 0 ? (
                    <EmptyBookmarks
                      type='empty-collection'
                      collectionName={
                        selectedCollection === 'uncategorized'
                          ? 'Uncategorized'
                          : collections.find((c) => c.id === selectedCollection)
                              ?.name
                      }
                    />
                  ) : (
                    <div
                      className={
                        viewMode === 'grid'
                          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                          : 'flex flex-col gap-3'
                      }
                    >
                      {filteredQuizzes.map((quiz) => (
                        <BookmarkedQuizCard
                          key={quiz.id}
                          quiz={quiz}
                          bookmark={quiz.bookmark}
                          collections={collections}
                          onRemove={removeBookmark}
                          onMoveToCollection={moveToCollection}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!selectedCollection && (
                <p className='text-muted-foreground text-center py-8'>
                  Select a collection to view its quizzes
                </p>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Create/Edit Collection Dialog */}
      <CollectionDialog
        open={collectionDialogOpen}
        onOpenChange={(open) => {
          setCollectionDialogOpen(open)
          if (!open) setEditingCollection(null)
        }}
        onSave={
          editingCollection ? handleEditCollection : handleCreateCollection
        }
        collection={editingCollection}
        mode={editingCollection ? 'edit' : 'create'}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the collection but keep the bookmarked quizzes.
              They will be moved to &quot;Uncategorized&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCollection}
              className='bg-red-600 hover:bg-red-700 text-white'
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
