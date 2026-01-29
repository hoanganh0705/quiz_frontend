'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useBookmarks } from '@/hooks/use-bookmarks'
import { Bookmark, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BookmarkButtonProps {
  quizId: string
  variant?: 'icon' | 'button' | 'icon-with-dropdown'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showTooltip?: boolean
}

export default function BookmarkButton({
  quizId,
  variant = 'icon',
  size = 'md',
  className,
  showTooltip = true
}: BookmarkButtonProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const {
    isBookmarked,
    toggleBookmark,
    collections,
    getBookmark,
    moveToCollection
  } = useBookmarks()

  const bookmarked = isBookmarked(quizId)
  const currentBookmark = getBookmark(quizId)

  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-10 w-10'
  }

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  // Simple icon button
  if (variant === 'icon') {
    const button = (
      <Button
        variant='ghost'
        size='icon'
        onClick={() => toggleBookmark(quizId)}
        className={cn(sizeClasses[size], className)}
        aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
      >
        <Bookmark
          className={cn(
            iconSizes[size],
            bookmarked
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-muted-foreground hover:text-foreground'
          )}
        />
      </Button>
    )

    if (showTooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent>
              <p>{bookmarked ? 'Remove from saved' : 'Save for later'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return button
  }

  // Full button with text
  if (variant === 'button') {
    return (
      <Button
        variant={bookmarked ? 'default' : 'outline'}
        onClick={() => toggleBookmark(quizId)}
        className={cn(
          bookmarked && 'bg-yellow-500 hover:bg-yellow-600 text-white',
          className
        )}
      >
        <Bookmark
          className={cn('mr-2', iconSizes[size], bookmarked && 'fill-current')}
        />
        {bookmarked ? 'Saved' : 'Save'}
      </Button>
    )
  }

  // Icon with dropdown for collection selection
  if (variant === 'icon-with-dropdown') {
    return (
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className={cn(sizeClasses[size], 'relative group', className)}
            aria-label='Bookmark options'
          >
            <Bookmark
              className={cn(
                iconSizes[size],
                bookmarked
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground group-hover:text-foreground'
              )}
            />
            <ChevronDown className='absolute -bottom-0.5 -right-0.5 h-3 w-3 text-muted-foreground' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-52'>
          {/* Toggle bookmark */}
          <DropdownMenuItem onClick={() => toggleBookmark(quizId)}>
            <Bookmark
              className={cn(
                'mr-2 h-4 w-4',
                bookmarked && 'fill-yellow-400 text-yellow-400'
              )}
            />
            {bookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
          </DropdownMenuItem>

          {bookmarked && (
            <>
              <DropdownMenuSeparator />
              <div className='px-2 py-1.5 text-xs font-medium text-muted-foreground'>
                Move to collection
              </div>

              {/* Uncategorized option */}
              <DropdownMenuItem
                onClick={() => moveToCollection(quizId, null)}
                className='flex items-center justify-between'
              >
                <span>Uncategorized</span>
                {currentBookmark?.collectionId === null && (
                  <Check className='h-4 w-4' />
                )}
              </DropdownMenuItem>

              {/* Collections */}
              {collections.map((collection) => (
                <DropdownMenuItem
                  key={collection.id}
                  onClick={() => moveToCollection(quizId, collection.id)}
                  className='flex items-center justify-between'
                >
                  <div className='flex items-center gap-2'>
                    <div
                      className='w-3 h-3 rounded-full'
                      style={{ backgroundColor: collection.color }}
                    />
                    <span>{collection.name}</span>
                  </div>
                  {currentBookmark?.collectionId === collection.id && (
                    <Check className='h-4 w-4' />
                  )}
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return null
}
