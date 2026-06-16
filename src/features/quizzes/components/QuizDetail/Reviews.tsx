'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import Image from 'next/image'
import StarRating from '@/features/quizzes/components/StarRating'
import { getReviews } from '@/features/reviews'
import type { ReviewResponseDto } from '@/lib/api/generated/schemas'

interface ReviewsProps {
  quizId: string
}

export default function Reviews({ quizId }: ReviewsProps) {
  const [reviews, setReviews] = useState<ReviewResponseDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReviews() {
      try {
        const data = await getReviews(quizId, { limit: 20 })
        setReviews(data.items)
      } catch {
        setError('Failed to load reviews')
      } finally {
        setLoading(false)
      }
    }
    fetchReviews()
  }, [quizId])

  if (loading) {
    return (
      <div className='bg-background text-foreground p-6 min-h-screen'>
        <div className='mx-auto'>
          <div className='flex justify-between items-center mb-8'>
            <h1 className='text-xl font-bold text-foreground'>Reviews</h1>
          </div>
          <div className='space-y-4'>
            {[1, 2, 3].map((i) => (
              <div key={i} className='border border-border rounded-lg p-6 bg-background animate-pulse'>
                <div className='flex items-start gap-4'>
                  <div className='w-12 h-12 rounded-full bg-muted' />
                  <div className='flex-1'>
                    <div className='h-4 w-24 bg-muted rounded mb-2' />
                    <div className='h-3 w-full bg-muted rounded' />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='bg-background text-foreground p-6 min-h-screen'>
        <div className='mx-auto'>
          <div className='flex justify-between items-center mb-8'>
            <h1 className='text-xl font-bold text-foreground'>Reviews</h1>
          </div>
          <p className='text-muted-foreground'>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className='bg-background text-white p-6 min-h-screen'>
      <div className='mx-auto'>
        {/* Header */}
        <div className='flex justify-between items-center mb-8'>
          <h1 className='text-xl font-bold text-foreground'>Reviews</h1>
          <Button
            className='bg-brand hover:bg-brand text-white px-6 py-2 rounded-lg'
            aria-label='Write a new review'
          >
            Write a Review
          </Button>
        </div>

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <p className='text-muted-foreground'>No reviews yet. Be the first to review!</p>
        ) : (
          <div className='space-y-4 text-foreground' role='list'>
            {reviews.map((review) => (
              <article
                key={review.reviewId}
                className='border border-border rounded-lg p-6 bg-background'
                role='listitem'
              >
                <div className='flex items-start gap-4'>
                  {/* Avatar */}
                  <div className='shrink-0'>
                    <Image
                      src={review.user?.avatarUrl ?? '/placeholder.svg'}
                      alt={review.user?.displayName ?? 'User avatar'}
                      width={48}
                      height={48}
                      loading='lazy'
                      className='rounded-full'
                    />
                  </div>

                  {/* Content */}
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between mb-2'>
                      <h3 className='font-semibold text-foreground/80 truncate'>
                        {review.user?.displayName ?? 'Anonymous'}
                      </h3>
                      <StarRating rating={review.rating ?? 0} />
                    </div>
                    <p className='text-foreground/80 text-sm leading-relaxed wrap-break-word'>
                      {review.comment ?? 'No comment provided.'}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
