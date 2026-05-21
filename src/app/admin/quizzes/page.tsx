'use client'

import type React from 'react'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Avatar, AvatarFallback } from '@/components/ui/Avatar'
import { AdminPageHeader } from '../_components'

interface Quiz {
  id: string
  title: string
  category: string
  author: string
  authorAvatar: string
  questions: number
  plays: number
  rating: number
  status: 'published' | 'draft' | 'flagged' | 'archived'
  createdAt: string
}

const mockQuizzes: Quiz[] = [
  { id: '1', title: 'World War II History', category: 'History', author: 'HistoryBuff', authorAvatar: 'HB', questions: 20, plays: 4521, rating: 4.7, status: 'published', createdAt: '2024-08-01' },
  { id: '2', title: 'Python Programming Basics', category: 'Technology', author: 'CodeMaster', authorAvatar: 'CM', questions: 15, plays: 3240, rating: 4.5, status: 'published', createdAt: '2024-08-05' },
  { id: '3', title: 'Periodic Table Challenge', category: 'Science', author: 'ChemWiz', authorAvatar: 'CW', questions: 25, plays: 2100, rating: 4.3, status: 'published', createdAt: '2024-08-10' },
  { id: '4', title: 'Capital Cities of the World', category: 'Geography', author: 'GeoPro', authorAvatar: 'GP', questions: 30, plays: 5890, rating: 4.8, status: 'published', createdAt: '2024-08-12' },
  { id: '5', title: 'Movie Trivia Night', category: 'Entertainment', author: 'FilmFan', authorAvatar: 'FF', questions: 18, plays: 1876, rating: 4.1, status: 'flagged', createdAt: '2024-08-15' },
  { id: '6', title: 'Advanced Calculus', category: 'Mathematics', author: 'MathGuru', authorAvatar: 'MG', questions: 22, plays: 890, rating: 4.6, status: 'draft', createdAt: '2024-08-18' },
  { id: '7', title: 'World Capitals 2024', category: 'Geography', author: 'TravelBug', authorAvatar: 'TB', questions: 50, plays: 6234, rating: 4.9, status: 'published', createdAt: '2024-08-20' },
  { id: '8', title: 'Literature Classics', category: 'Literature', author: 'BookWorm', authorAvatar: 'BW', questions: 16, plays: 1234, rating: 4.4, status: 'archived', createdAt: '2024-08-22' }
]

const statusConfig = {
  published: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400', label: 'Published' },
  draft: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-400', label: 'Draft' },
  flagged: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-400', label: 'Flagged' },
  archived: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Archived' }
}

const StarRating = ({ rating }: { rating: number }) => (
  <div className='flex items-center gap-0.5'>
    {[1, 2, 3, 4, 5].map((star) => (
      <svg
        key={star}
        className={`h-3 w-3 ${star <= Math.round(rating) ? 'text-yellow-500' : 'text-muted'}`}
        fill='currentColor'
        viewBox='0 0 20 20'
      >
        <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
      </svg>
    ))}
    <span className='ml-1 text-xs text-muted-foreground'>{rating.toFixed(1)}</span>
  </div>
)

export default function AdminQuizzesPage() {
  const handleCreate = () => {
    console.log('Create quiz')
  }

  const handleEdit = (id: string) => {
    console.log('Edit quiz:', id)
  }

  const handleDelete = (id: string) => {
    console.log('Delete quiz:', id)
  }

  return (
    <div className='px-4 sm:px-6 pb-8'>
      <AdminPageHeader
        title='Quizzes'
        description='Review, moderate, and manage quizzes on the platform.'
        actionLabel='Create Quiz'
        actionIcon={Plus}
        onAction={handleCreate}
      />

      <div className='space-y-3'>
        {mockQuizzes.map((quiz) => {
          const status = statusConfig[quiz.status]
          return (
            <div
              key={quiz.id}
              className='rounded-lg border border-border p-4 hover:border-default/50 transition-colors'
            >
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-start gap-3 min-w-0 flex-1'>
                  <div className='p-2 rounded-lg bg-muted shrink-0'>
                    <div className='h-5 w-5 bg-muted-foreground/50 rounded-sm' />
                  </div>

                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <h3 className='font-semibold text-foreground'>{quiz.title}</h3>
                      <Badge variant='secondary' className='text-xs'>
                        {quiz.category}
                      </Badge>
                      <Badge variant='secondary' className={`${status.bg} ${status.text}`}>
                        {status.label}
                      </Badge>
                    </div>

                    <div className='flex items-center gap-4 mt-2'>
                      <div className='flex items-center gap-1.5'>
                        <Avatar className='h-5 w-5'>
                          <AvatarFallback className='text-[9px] bg-muted text-muted-foreground'>
                            {quiz.authorAvatar}
                          </AvatarFallback>
                        </Avatar>
                        <span className='text-xs text-muted-foreground'>by {quiz.author}</span>
                      </div>

                      <span className='text-xs text-muted-foreground'>
                        {quiz.questions} questions
                      </span>
                      <span className='text-xs text-muted-foreground'>
                        {quiz.plays.toLocaleString()} plays
                      </span>
                      <StarRating rating={quiz.rating} />
                    </div>

                    <p className='text-xs text-muted-foreground mt-1'>
                      Created {quiz.createdAt}
                    </p>
                  </div>
                </div>

                <div className='flex items-center gap-2 shrink-0'>
                  <button
                    onClick={() => handleEdit(quiz.id)}
                    className='px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors text-foreground'
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(quiz.id)}
                    className='px-3 py-1.5 text-xs font-medium rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors'
                  >
                    Delete
                  </button>
                </div>
              </div>

              {quiz.status === 'flagged' && (
                <div className='mt-3 p-2.5 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900'>
                  <p className='text-xs font-medium text-red-700 dark:text-red-400'>
                    This quiz has been flagged for review. Reason: Reported by community (inappropriate content).
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
