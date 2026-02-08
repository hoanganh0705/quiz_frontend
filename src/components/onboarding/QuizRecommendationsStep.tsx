'use client'

import { useMemo, memo } from 'react'
// Fix barrel imports (bundle-barrel-imports)
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { quizzes } from '@/constants/mockQuizzes'
import { categories } from '@/constants/categories'
import { difficultyColors } from '@/constants/difficultyColor'
import {
  ArrowLeft,
  PartyPopper,
  Clock,
  HelpCircle,
  Star,
  Play
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface QuizRecommendationsStepProps {
  selectedInterests: string[]
  onComplete: () => void
  onBack: () => void
}

// Hoist helper function outside component (data-hoisting)
function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes} min`
}

export const QuizRecommendationsStep = memo(function QuizRecommendationsStep({
  selectedInterests,
  onComplete,
  onBack
}: QuizRecommendationsStepProps) {
  // Get recommended quizzes based on selected interests
  const recommendedQuizzes = useMemo(() => {
    // Map category IDs to category names
    const interestNames = selectedInterests
      .map((id) => categories.find((cat) => cat.id === id)?.name)
      .filter(Boolean) as string[]

    // Filter quizzes that match user interests
    let filtered = quizzes.filter((quiz) =>
      quiz.categories.some((cat) =>
        interestNames.some(
          (interest) =>
            cat.toLowerCase().includes(interest.toLowerCase()) ||
            interest.toLowerCase().includes(cat.toLowerCase())
        )
      )
    )

    // If no matches found, show featured/popular quizzes
    if (filtered.length === 0) {
      filtered = quizzes.filter((quiz) => quiz.isFeatured || quiz.isPopular)
    }

    // Return top 6 recommendations
    return filtered.slice(0, 6)
  }, [selectedInterests])

  return (
    <div className='space-y-8'>
      {/* Header */}
      <div className='text-center space-y-2'>
        <div
          className='inline-flex items-center justify-center w-16 h-16 rounded-full bg-default/10 mb-2'
          aria-hidden='true'
        >
          <PartyPopper className='w-8 h-8 text-default' />
        </div>
        <h2 className='text-2xl md:text-3xl font-bold text-foreground'>
          You&apos;re all set! 🎉
        </h2>
        <p className='text-muted-foreground'>
          Based on your interests, here are some quizzes we think you&apos;ll
          love
        </p>
      </div>

      {/* Quiz Recommendations Grid */}
      <div
        className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
        role='list'
        aria-label='Recommended quizzes'
      >
        {recommendedQuizzes.map((quiz) => (
          <article
            key={quiz.id}
            className='group rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-lg hover:border-default/50'
            role='listitem'
          >
            {/* Quiz Image */}
            <div className='relative h-32 overflow-hidden'>
              <Image
                src={quiz.image}
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
                    quiz.difficulty as keyof typeof difficultyColors
                  ]?.bg || 'bg-gray-500'
                } text-white text-xs`}
              >
                {quiz.difficulty}
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
                  {formatDuration(quiz.duration)}
                </span>
                <span className='flex items-center gap-1'>
                  <HelpCircle className='w-3 h-3' aria-hidden='true' />
                  {quiz.questionCount} Qs
                </span>
                <span className='flex items-center gap-1'>
                  <Star
                    className='w-3 h-3 fill-yellow-400 text-yellow-400'
                    aria-hidden='true'
                  />
                  {quiz.rating}
                </span>
              </div>

              {/* Categories */}
              <div
                className='flex flex-wrap gap-1'
                aria-label='Quiz categories'
              >
                {quiz.categories.slice(0, 2).map((cat) => (
                  <span
                    key={cat}
                    className='px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs'
                  >
                    {cat}
                  </span>
                ))}
              </div>

              {/* Play Button */}
              <Link
                href={`/quizzes/${quiz.title.toLowerCase().replace(/\s+/g, '-')}`}
                className='block'
              >
                <Button
                  size='sm'
                  className='w-full bg-default hover:bg-default-hover text-white'
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
            className='bg-default hover:bg-default-hover text-white px-8'
            aria-label='Complete onboarding and start exploring'
          >
            Start Exploring QuizHub 🚀
          </Button>
        </nav>
      </div>
    </div>
  )
})
