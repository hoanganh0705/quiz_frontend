import React from 'react'
import { Button } from '../ui/button'
import { quizzes } from '@/constants/mockQuizzes'
import Image from 'next/image'
import StarRating from '../StarRating'

const Reviews = () => {
  return (
    <div className='bg-background text-white p-6 min-h-screen'>
      <div className=' mx-auto'>
        {/* Header */}
        <div className='flex justify-between items-center mb-8'>
          <h1 className='text-xl font-bold text-foreground'>Reviews</h1>
          <Button
            className='bg-default hover:bg-default-hover text-white px-6 py-2 rounded-lg'
            aria-label='Write a new review'
          >
            Write a Review
          </Button>
        </div>

        {/* Reviews List */}
        <div className='space-y-4 text-foreground'>
          {quizzes.map((quiz, quizIndex) =>
            quiz.quizReview?.map((review) => (
              <div
                key={`${quiz.id || quizIndex}-${review.userId}`}
                className='border border-slate-700 rounded-lg p-6 bg-background'
              >
                <div className='flex items-start gap-4'>
                  {/* Avatar */}
                  <div className='shrink-0'>
                    <Image
                      src={quiz.authorAvatarSrc || '/placeholder.svg'}
                      alt={
                        review.username
                          ? `${review.username} avatar`
                          : 'User avatar'
                      }
                      width={48}
                      height={48}
                      className='rounded-full'
                    />
                  </div>

                  {/* Content */}
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between mb-2'>
                      <h3 className='font-semibold text-foreground/80 truncate'>
                        {review.username || 'Anonymous'}
                      </h3>
                      <StarRating rating={review.rating ?? 0} />
                    </div>
                    <p className='text-foreground/80 text-sm leading-relaxed wrap-break-word'>
                      {review.comment || 'No comment provided.'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default Reviews
