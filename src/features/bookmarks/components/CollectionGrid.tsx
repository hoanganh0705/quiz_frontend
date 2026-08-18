'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import type { BookmarkCollection } from '@/features/bookmarks/types'
import CollectionCard from './CollectionCard'

interface CollectionGridProps {

collections: readonly BookmarkCollection[]

isLoading?: boolean

isLoadingMore?: boolean

hasMore?: boolean

onLoadMore?: () => void

selectedId?: string | null

onSelect?: (collection: BookmarkCollection) => void

onRename?: (collection: BookmarkCollection) => void

onChangeColor?: (collection: BookmarkCollection) => void

onDelete?: (collection: BookmarkCollection) => void
}

const SkeletonGrid = memo(function SkeletonGrid() {
return (
<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
{Array.from({ length: 6 }).map((_, i) => (
<div
key={i}
className='group relative p-4 rounded-lg border border-border'
        >
<Skeleton className='absolute top-0 left-0 w-1 h-full rounded-l-lg' />
<div className='flex flex-col gap-2 pl-2'>
<div className='flex items-center gap-2'>
<Skeleton className='h-4 w-4 rounded' />
<Skeleton className='h-4 w-24' />
</div>
<Skeleton className='h-3 w-32' />
<Skeleton className='h-3 w-16' />
</div>
</div>
      ))}
</div>
  )
})

const CollectionGrid = memo(function CollectionGrid({
collections,
isLoading = false,
isLoadingMore = false,
hasMore = false,
onLoadMore,
selectedId,
onSelect,
onRename,
onChangeColor,
onDelete
}: CollectionGridProps) {
if (isLoading) {
return <SkeletonGrid />
  }

if (collections.length === 0) {
return null // Empty state handled by parent
  }

return (
<div className='flex flex-col gap-6'>
<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
{collections.map((collection) => (
<CollectionCard
key={collection.collectionId}
collection={collection}
isSelected={selectedId === collection.collectionId}
onSelect={onSelect ? () => onSelect(collection) : undefined}
onRename={onRename ? () => onRename(collection) : undefined}
onChangeColor={onChangeColor ? () => onChangeColor(collection) : undefined}
onDelete={onDelete ? () => onDelete(collection) : undefined}
          />
        ))}
</div>

{hasMore && onLoadMore && (
<div className='flex justify-center'>
<Button
variant='outline'
onClick={onLoadMore}
disabled={isLoadingMore}
          >
{isLoadingMore ? 'Loading...' : 'Load more'}
</Button>
</div>
      )}
</div>
  )
})

export default CollectionGrid
