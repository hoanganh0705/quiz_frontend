'use client'

import { useEffect, useState } from 'react'
import { memo } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { listQuizzes } from '@/features/quizzes/services/quizzes.service'
import { difficultyColors } from '@/features/quizzes/constants/difficulty-color'
import {
  ArrowLeft,
  PartyPopper,
  Clock,
  HelpCircle,
  Play
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { QuizResponseDto } from '@/lib/api/generated/schemas'
import { logger } from '@/shared/log'

interface QuizRecommendationsStepProps {
  selectedInterests: string[]
  onComplete: () => void
  onBack: () => void
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes} min`
}

export const QuizRecommendationsStep = memo(function QuizRecommendationsStep({
  onComplete,
  onBack
}: QuizRecommendationsStepProps) {
  const [quizzes, setQuizzes] = useState<QuizResponseDto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchQuizzes() {
      try {
        const data = await listQuizzes({ featured: true, limit: 6 })
        setQuizzes(((data as unknown as { data?: QuizResponseDto[] }).data ?? []) as QuizResponseDto[])
      } catch (error) {
        logger.error('onboarding.recommendations', 'Failed to fetch quizzes', error)
      } finally {
        setLoading(false)
      }
    }
    fetchQuizzes()
  }, [])

  const recommendedQuizzes = quizzes.slice(0, 6)

  return (
    <div className='space-y-8'>
      {/* Header */}
      <div className='text-center space-y-2'>
        <div
          className='inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand/10 mb-2'
          aria-hidden='true'
        >
          <PartyPopper className='w-8 h-8 text-brand' />
        </div>
        <h2 className='text-2xl md:text-3xl font-bold text-foreground'>
          You&apos;re all set! 🎉
        </h2>
        <p className='text-muted-foreground'>
          Based on your interests, here are some quizzes we think you&apos;ll love
        </p>
      </div>

      {/* Quiz Recommendations Grid */}
      {loading ? (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className='rounded-xl border border-border bg-card overflow-hidden animate-pulse'>
              <div className='h-32 bg-muted' />
              <div className='p-4 space-y-3'>
                <div className='h-4 w-3/4 bg-muted rounded' />
                <div className='h-3 w-1/2 bg-muted rounded' />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
          role='list'
          aria-label='Recommended quizzes'
        >
          {recommendedQuizzes.map((quiz) => (
            <article
              key={quiz.quizId}
              className='group rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-lg hover:border-brand/50'
              role='listitem'
            >
              {/* Quiz Image */}
              <div className='relative h-32 overflow-hidden'>
                <Image
                  src={quiz.imageUrl ?? '/placeholder.webp'}
                  alt={quiz.title}
                  fill
                  className='object-cover transition-transform group-hover:scale-105'
                />
                <div
                  className='absolute inset-0 bg-linear-to-t from-black/60 to-transparent'
                  aria-hidden='true'
                />
                <Badge
                  className={`absolute top-2 left-2 ${
                    difficultyColors[
                      ((quiz.publishedVersion?.difficulty ?? 'medium') as string).charAt(0).toUpperCase() +
                        ((quiz.publishedVersion?.difficulty ?? 'medium') as string).slice(1) as keyof typeof difficultyColors
                    ]?.bg || 'bg-gray-500'
                  } text-white text-xs`}
                >
                  {quiz.publishedVersion?.difficulty ?? 'medium'}
                </Badge>
              </div>

              {/* Quiz Info */}
              <div className='p-4 space-y-3'>
                <h3 className='font-semibold text-foreground line-clamp-1'>
                  {quiz.title}
                </h3>

                {/* Stats */}
                <div className='flex items-center gap-4 text-xs text-muted-foreground'>
                  <span className='flex items-center gap-1'>
                    <Clock className='w-3 h-3' aria-hidden='true' />
                    {quiz.publishedVersion?.durationMs
                      ? formatDuration(quiz.publishedVersion.durationMs / 1000)
                      : 'N/A'}
                  </span>
                  <span className='flex items-center gap-1'>
                    <HelpCircle className='w-3 h-3' aria-hidden='true' />
                    {quiz.publishedVersion?.questions?.length ?? 0} Qs
                  </span>
                </div>

                {/* Play Button */}
                <Link href={`/quizzes/${quiz.slug}`} className='block'>
                  <Button
                    size='sm'
                    className='w-full bg-brand hover:bg-brand-hover text-white'
                    aria-label={`Play ${quiz.title} quiz`}
                  >
                    <Play className='w-4 h-4 mr-1' aria-hidden='true' />
                    Play Now
                  </Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Completion Section */}
      <div className='text-center space-y-4 pt-4'>
        <p className='text-sm text-muted-foreground'>
          You can always explore more quizzes from the home page
        </p>
        <nav
          className='flex flex-col sm:flex-row gap-3 justify-center'
          aria-label='Final navigation'
        >
          <Button
            variant='outline'
            onClick={onBack}
            className='flex items-center gap-2'
            aria-label='Go back to previous step'
          >
            <ArrowLeft className='w-4 h-4' aria-hidden='true' />
            Back
          </Button>
          <Button
            onClick={onComplete}
            size='lg'
            className='bg-brand hover:bg-brand-hover text-white px-8'
            aria-label='Complete onboarding and start exploring'
          >
            Start Exploring QuizHub 🚀
          </Button>
        </nav>
      </div>
    </div>
  )
})
