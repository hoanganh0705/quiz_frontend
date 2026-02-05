'use client'

import { memo } from 'react' // rerender-memo
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { difficultyColors } from '@/constants/difficultColor'
// Fix barrel imports (bundle-barrel-imports)
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { DropdownMenuContent } from '@/components/ui/dropdown-menu'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  Bookmark,
  MoreVertical,
  Play,
  Trash2,
  FolderInput,
  Clock,
  Users
} from 'lucide-react'
import Link from 'next/link'
import type { Quiz } from '@/types/quiz'
import type { BookmarkedQuiz, BookmarkCollection } from '@/types/bookmarks'
import { formatDistanceToNow } from 'date-fns'

interface BookmarkedQuizCardProps {
  quiz: Quiz
  bookmark: BookmarkedQuiz
  collections: BookmarkCollection[]
  onRemove: (quizId: string) => void
  onMoveToCollection: (quizId: string, collectionId: string | null) => void
}

// Use memo to prevent unnecessary re-renders (rerender-memo)
const BookmarkedQuizCard = memo(function BookmarkedQuizCard({
  quiz,
  bookmark,
  collections,
  onRemove,
  onMoveToCollection
}: BookmarkedQuizCardProps) {
  const currentCollection = collections.find(
    (c) => c.id === bookmark.collectionId
  )

  return (
    <div className='group rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600'>
      <div className='relative h-40'>
        <Image
          src={quiz.image || '/placeholder.webp'}
          alt={quiz.title}
          fill
          sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'
          className='object-cover'
        />

        {/* Overlay */}
        <div className='absolute inset-0 bg-linear-to-t from-black/70 to-transparent flex flex-col justify-between p-3'>
          {/* Top Row: Difficulty & Menu */}
          <div className='flex justify-between items-start'>
            <Badge
              className={`${
                difficultyColors[
                  quiz.difficulty as keyof typeof difficultyColors
                ]?.bg || 'bg-gray-500'
              } text-white text-xs`}
            >
              {quiz.difficulty}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 bg-black/30 hover:bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity'
                  aria-label='Quiz options menu'
                >
                  <MoreVertical className='h-4 w-4' aria-hidden='true' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-48'>
                <DropdownMenuItem
                  onClick={() => onMoveToCollection(quiz.id, null)}
                  disabled={bookmark.collectionId === null}
                >
                  <FolderInput className='mr-2 h-4 w-4' />
                  Move to Uncategorized
                </DropdownMenuItem>
                {collections.map((collection) => (
                  <DropdownMenuItem
                    key={collection.id}
                    onClick={() => onMoveToCollection(quiz.id, collection.id)}
                    disabled={bookmark.collectionId === collection.id}
                  >
                    <div
                      className='w-3 h-3 rounded-full mr-2'
                      style={{ backgroundColor: collection.color }}
                    />
                    Move to {collection.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onRemove(quiz.id)}
                  className='text-red-600 dark:text-red-400'
                >
                  <Trash2 className='mr-2 h-4 w-4' />
                  Remove Bookmark
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Bottom: Title & Collection */}
          <div>
            {currentCollection && (
              <div className='flex items-center gap-1.5 mb-1.5'>
                <div
                  className='w-2 h-2 rounded-full'
                  style={{ backgroundColor: currentCollection.color }}
                />
                <span className='text-xs text-white/80'>
                  {currentCollection.name}
                </span>
              </div>
            )}
            <h3 className='font-semibold text-white line-clamp-2 text-sm'>
              {quiz.title}
            </h3>
          </div>
        </div>

        {/* Bookmark indicator */}
        <div
          className='absolute top-3 right-12 group-hover:right-3 transition-all'
          aria-hidden='true'
        >
          <Bookmark className='h-5 w-5 text-yellow-400 fill-yellow-400' />
        </div>
      </div>

      {/* Card Body */}
      <div className='p-3'>
        {/* Meta info */}
        <div className='flex items-center gap-4 text-xs text-muted-foreground mb-3'>
          <div className='flex items-center gap-1'>
            <Clock className='h-3.5 w-3.5' aria-hidden='true' />
            <span>{Math.floor(quiz.duration / 60)} min</span>
          </div>
          <div className='flex items-center gap-1'>
            <Users className='h-3.5 w-3.5' aria-hidden='true' />
            <span>{quiz.players} plays</span>
          </div>
          {quiz.categories?.[0] && (
            <Badge variant='secondary' className='text-xs py-0 h-5'>
              {quiz.categories[0]}
            </Badge>
          )}
        </div>

        {/* Bookmarked date */}
        <p className='text-xs text-muted-foreground mb-3'>
          Saved{' '}
          {formatDistanceToNow(new Date(bookmark.bookmarkedAt), {
            addSuffix: true
          })}
        </p>

        {/* Action */}
        <Button
          asChild
          className='w-full bg-default hover:bg-default-hover text-white'
          size='sm'
        >
          <Link
            href={`/quizzes/${quiz.title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <Play className='mr-2 h-4 w-4' aria-hidden='true' />
            Play Quiz
          </Link>
        </Button>
      </div>
    </div>
  )
})

export default BookmarkedQuizCard
