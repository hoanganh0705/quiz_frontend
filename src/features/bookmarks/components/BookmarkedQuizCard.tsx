'use client'

import { memo } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { difficultyColors } from '@/features/quizzes/constants/difficulty-color'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { DropdownMenuContent } from '@/components/ui/DropdownMenu'
import { DropdownMenuItem } from '@/components/ui/DropdownMenu'
import { DropdownMenuSeparator } from '@/components/ui/DropdownMenu'
import { DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
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
import type { BookmarkedQuizResponseDto } from '@/lib/api/generated/schemas'
import type { BookmarkedQuiz, BookmarkCollection } from '@/features/bookmarks/types'
import { formatDistanceToNow } from 'date-fns'

interface QuizDisplay {
id?: string
quizId: string
quizTitle: string
quizSlug: string
quizImageUrl?: string | null
quizIsFeatured: boolean
notes?: string | null
bookmarkedAt: string

difficulty?: string
duration?: number
currentPlayers?: number
categories?: string[]
}

interface BookmarkedQuizCardProps {
quiz: QuizDisplay
bookmark: BookmarkedQuiz
collections: BookmarkCollection[]
onRemove: (quizId: string) => void
onMoveToCollection: (quizId: string, collectionId: string | null) => void
}

const BookmarkedQuizCard = memo(function BookmarkedQuizCard({
quiz,
bookmark,
collections,
onRemove,
onMoveToCollection
}: BookmarkedQuizCardProps) {
const currentCollection = collections.find(
(c) => c.id === (bookmark as unknown as { collectionId?: string }).collectionId
  )

const quizId = quiz.id ?? quiz.quizId

return (
<div className='group rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:border-border'>
<div className='relative h-40'>
<Image
src={quiz.quizImageUrl ?? '/placeholder.webp'}
alt={quiz.quizTitle}
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
(quiz.difficulty?.charAt(0).toUpperCase() + (quiz.difficulty ?? '').slice(1)) as keyof typeof difficultyColors
                ]?.bg ?? 'bg-gray-500'
} text-white text-xs`}
            >
{quiz.difficulty ?? 'Unknown'}
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
onClick={() => onMoveToCollection(quizId, null)}
disabled={(bookmark as unknown as { collectionId?: string | null }).collectionId === null}
                >
<FolderInput className='mr-2 h-4 w-4' />
Move to Uncategorized
                </DropdownMenuItem>
{collections.map((collection) => (
<DropdownMenuItem
key={collection.id}
onClick={() => onMoveToCollection(quizId, collection.id)}
disabled={(bookmark as unknown as { collectionId?: string }).collectionId === collection.id}
                  >
<div
className='w-3 h-3 rounded-full mr-2'
style={{ backgroundColor: (collection.color ?? undefined) as string | undefined }}
                    />
Move to {collection.name}
</DropdownMenuItem>
                ))}
<DropdownMenuSeparator />
<DropdownMenuItem
onClick={() => onRemove(quizId)}
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
style={{ backgroundColor: (currentCollection.color ?? undefined) as string | undefined }}
                />
<span className='text-xs text-white/80'>
{currentCollection.name}
</span>
</div>
            )}
<h3 className='font-semibold text-white line-clamp-2 text-sm'>
{quiz.quizTitle}
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
<span>{Math.floor((quiz.duration ?? 0) / 60)} min</span>
</div>
<div className='flex items-center gap-1'>
<Users className='h-3.5 w-3.5' aria-hidden='true' />
<span>{quiz.currentPlayers ?? 0} plays</span>
</div>
{/* categories omitted — not in BookmarkedQuizResponseDto */}
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
className='w-full bg-brand hover:bg-brand-hover text-white'
size='sm'
        >
<Link href={`/quizzes/${quiz.quizSlug}`}>
<Play className='mr-2 h-4 w-4' aria-hidden='true' />
Play Quiz
          </Link>
</Button>
</div>
</div>
  )
})

export default BookmarkedQuizCard
