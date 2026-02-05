'use client'

import { memo } from 'react' // rerender-memo
import { Bookmark, FolderPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyBookmarksProps {
  type: 'no-bookmarks' | 'no-results' | 'empty-collection'
  collectionName?: string
  onCreateCollection?: () => void
}

// Use memo for static content component (rerender-memo)
const EmptyBookmarks = memo(function EmptyBookmarks({
  type,
  collectionName,
  onCreateCollection
}: EmptyBookmarksProps) {
  if (type === 'no-bookmarks') {
    return (
      <div className='flex flex-col items-center justify-center py-16 px-4 text-center'>
        <div className='rounded-full bg-muted p-6 mb-4' aria-hidden='true'>
          <Bookmark className='h-12 w-12 text-muted-foreground' />
        </div>
        <h3 className='text-xl font-semibold mb-2'>No bookmarks yet</h3>
        <p className='text-muted-foreground max-w-sm mb-6'>
          Start exploring quizzes and bookmark your favorites to access them
          quickly later.
        </p>
        <div className='flex gap-3'>
          <Button
            asChild
            className='bg-default hover:bg-default-hover text-white'
          >
            <a href='/quizzes'>Explore Quizzes</a>
          </Button>
          {onCreateCollection && (
            <Button variant='outline' onClick={onCreateCollection}>
              <FolderPlus className='mr-2 h-4 w-4' aria-hidden='true' />
              Create Collection
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (type === 'no-results') {
    return (
      <div className='flex flex-col items-center justify-center py-12 px-4 text-center'>
        <div className='rounded-full bg-muted p-4 mb-4' aria-hidden='true'>
          <Bookmark className='h-8 w-8 text-muted-foreground' />
        </div>
        <h3 className='text-lg font-semibold mb-2'>No matching bookmarks</h3>
        <p className='text-muted-foreground text-sm'>
          Try adjusting your search or filters to find what you&apos;re looking
          for.
        </p>
      </div>
    )
  }

  if (type === 'empty-collection') {
    return (
      <div className='flex flex-col items-center justify-center py-12 px-4 text-center'>
        <div className='rounded-full bg-muted p-4 mb-4' aria-hidden='true'>
          <FolderPlus className='h-8 w-8 text-muted-foreground' />
        </div>
        <h3 className='text-lg font-semibold mb-2'>
          {collectionName
            ? `"${collectionName}" is empty`
            : 'Collection is empty'}
        </h3>
        <p className='text-muted-foreground text-sm max-w-xs'>
          Add quizzes to this collection from the quiz details page or move
          existing bookmarks here.
        </p>
      </div>
    )
  }

  return null
})

export default EmptyBookmarks
