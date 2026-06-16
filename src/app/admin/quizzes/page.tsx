'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Avatar, AvatarFallback } from '@/components/ui/Avatar'
import { AdminPageHeader } from '../_components'
import { listQuizzes } from '@/features/quizzes/api'
import type { QuizResponseDto } from '@/lib/api/generated/schemas'

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
  const [quizzes, setQuizzes] = useState<QuizResponseDto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchQuizzes() {
      try {
        const data = await listQuizzes({ limit: 100 })
        setQuizzes(data.items)
      } catch (error) {
        console.error('Failed to fetch quizzes:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchQuizzes()
  }, [])

  const handleCreate = () => {
    console.log('Create quiz')
  }

  const handleEdit = (id: string) => {
    console.log('Edit quiz:', id)
  }

  const handleDelete = (id: string) => {
    console.log('Delete quiz:', id)
  }

  if (loading) {
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
          {[1, 2, 3].map((i) => (
            <div key={i} className='rounded-lg border border-border p-4 animate-pulse'>
              <div className='flex items-start gap-3'>
                <div className='h-10 w-10 bg-muted rounded' />
                <div className='flex-1 space-y-2'>
                  <div className='h-4 w-1/3 bg-muted rounded' />
                  <div className='h-3 w-1/2 bg-muted rounded' />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
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

      {quizzes.length === 0 ? (
        <p className='text-muted-foreground text-center py-12'>No quizzes found.</p>
      ) : (
        <div className='space-y-3'>
          {quizzes.map((quiz) => (
            <div
              key={quiz.quizId}
              className='rounded-lg border border-border p-4 hover:border-brand/50 transition-colors'
            >
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-start gap-3 min-w-0 flex-1'>
                  <div className='p-2 rounded-lg bg-muted shrink-0'>
                    {quiz.imageUrl ? (
                      <img src={quiz.imageUrl} alt='' className='h-5 w-5 rounded' />
                    ) : (
                      <div className='h-5 w-5 bg-muted-foreground/50 rounded-sm' />
                    )}
                  </div>

                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <h3 className='font-semibold text-foreground'>{quiz.title}</h3>
                      {quiz.isFeatured && (
                        <Badge variant='secondary' className='text-xs'>Featured</Badge>
                      )}
                      {quiz.isHidden && (
                        <Badge className='bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-xs'>
                          Hidden
                        </Badge>
                      )}
                      {quiz.isVerified && (
                        <Badge className='bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs'>
                          Verified
                        </Badge>
                      )}
                    </div>

                    <div className='flex items-center gap-4 mt-2'>
                      <span className='text-xs text-muted-foreground'>
                        Created {new Date(quiz.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className='flex items-center gap-2 shrink-0'>
                  <button
                    onClick={() => handleEdit(quiz.quizId)}
                    className='px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors text-foreground'
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(quiz.quizId)}
                    className='px-3 py-1.5 text-xs font-medium rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors'
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
