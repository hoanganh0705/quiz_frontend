'use client'

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
import { useBookmarksPage } from '@/hooks/use-bookmarks-page'
import { Bookmark, FolderPlus, Grid3X3, List, Layers } from 'lucide-react'

export default function BookmarksPage() {
  const {
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
  } = useBookmarksPage()

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
