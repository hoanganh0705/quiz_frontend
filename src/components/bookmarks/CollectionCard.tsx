'use client'

import { memo } from 'react' // rerender-memo
import { Button } from '@/components/ui/button'
// Fix barrel imports (bundle-barrel-imports)
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { DropdownMenuContent } from '@/components/ui/dropdown-menu'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { BookmarkCollection } from '@/types/bookmarks'
import { MoreHorizontal, Pencil, Trash2, FolderOpen } from 'lucide-react'

interface CollectionCardProps {
  collection: BookmarkCollection
  count: number
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}

// Use memo to prevent unnecessary re-renders (rerender-memo)
const CollectionCard = memo(function CollectionCard({
  collection,
  count,
  isSelected,
  onSelect,
  onEdit,
  onDelete
}: CollectionCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`group relative p-4 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'border-default bg-default/5 shadow-sm'
          : 'border-border hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-sm'
      }`}
    >
      {/* Color indicator */}
      <div
        className='absolute top-0 left-0 w-1 h-full rounded-l-lg'
        style={{ backgroundColor: collection.color }}
      />

      <div className='flex items-start justify-between pl-2'>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-1'>
            <FolderOpen
              className='h-4 w-4 shrink-0'
              style={{ color: collection.color }}
              aria-hidden='true'
            />
            <h4 className='font-medium text-sm truncate'>{collection.name}</h4>
          </div>

          {collection.description && (
            <p className='text-xs text-muted-foreground line-clamp-1 mb-2'>
              {collection.description}
            </p>
          )}

          <span className='text-xs text-muted-foreground'>
            {count} {count === 1 ? 'quiz' : 'quizzes'}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity'
              aria-label='Collection options'
            >
              <MoreHorizontal className='h-4 w-4' aria-hidden='true' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
            >
              <Pencil className='mr-2 h-4 w-4' />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className='text-red-600 dark:text-red-400'
            >
              <Trash2 className='mr-2 h-4 w-4' />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
})

export default CollectionCard
