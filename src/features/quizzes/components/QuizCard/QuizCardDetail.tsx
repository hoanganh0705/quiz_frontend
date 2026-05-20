import Image from 'next/image'
import Link from 'next/link'
import { Clock, Users, DollarSign, Star, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import SpotAvailabilityIndicator from '@/features/quizzes/components/SpotAvailabilityIndicator'
import type { Quiz } from '@/features/quizzes/types'
import { ShareModal } from '@/shared/ui'
import { QuizCardDifficultyBadge } from './shared/QuizCardDifficultyBadge'
import { QuizCardCreator } from './shared/QuizCardCreator'

export interface QuizCardDetailProps {
  quiz: Quiz
}

export default function QuizCardDetail({ quiz }: QuizCardDetailProps) {
  return (
    <article
      role='listitem'
      className='border border-border rounded-xl overflow-hidden'
    >
      <div className='relative h-48'>
        <Image
          src={quiz.image}
          alt={`${quiz.title} quiz cover`}
          fill
          className='object-cover'
          loading='lazy'
        />
        <QuizCardDifficultyBadge
          difficulty={quiz.difficulty}
          className='absolute top-3 left-3 text-foreground'
        />
        <div className='absolute top-3 right-3 bg-transparent text-white rounded-full px-2 py-1 flex items-center gap-1 text-sm'>
          <Clock className='w-3 h-3' aria-hidden='true' />
          <span>{quiz.duration}</span>
        </div>
      </div>

      <div className='p-4'>
        <h3 className='font-bold text-lg mb-3 text-foreground truncate overflow-hidden'>
          {quiz.title}
        </h3>

        <div className='flex items-center gap-3 mb-3'>
          <QuizCardCreator
            imageURL={quiz.creator.imageURL}
            name={quiz.creator.name}
            avatarClassName='w-8 h-8 bg-main text-foreground'
            nameClassName='text-foreground/70 text-sm'
          />
          <Badge className='dark:bg-main bg-[#f8fafc] text-foreground border border-border'>
            {quiz.categories.join(', ')}
          </Badge>
        </div>

        <div className='flex items-center justify-between mb-3'>
          <div className='flex items-center gap-1'>
            <Star
              className='w-4 h-4 fill-yellow-400 text-yellow-400'
              aria-hidden='true'
            />
            <span className='text-foreground font-semibold'>{quiz.rating}</span>
            <span className='text-foreground/70 text-sm'>
              ({quiz.quizReview.length} reviews)
            </span>
          </div>
          <div className='flex items-center gap-1 text-green-400 font-bold'>
            <DollarSign className='w-4 h-4' aria-hidden='true' />
            {quiz.reward.toFixed(2)}
          </div>
        </div>

        <div className='flex items-center justify-between gap-4 mb-4 text-sm text-muted-foreground'>
          <div className='flex items-center gap-1'>
            <Users className='w-4 h-4' aria-hidden='true' />
            {quiz.currentPlayers} players
          </div>
          <div className='flex items-center gap-1'>
            <div>{quiz.spotsLeft} spots left</div>
            <SpotAvailabilityIndicator
              currentSpots={quiz.maxPlayers - quiz.spotsLeft}
              totalSpots={quiz.maxPlayers}
              mode='default'
            />
          </div>
        </div>

        {quiz.almostFull ? (
          <p className='text-red-400 text-sm mb-3' aria-live='polite'>
            Almost full! Only {quiz.spotsLeft} spots left
          </p>
        ) : null}

        <div className='flex gap-2'>
          <Button
            className='flex-1 bg-default hover:bg-default-hover text-white'
            asChild
          >
            <Link
              href={`/quizzes/${quiz.id}/start`}
              aria-label={`Play ${quiz.title}`}
            >
              Play Now
            </Link>
          </Button>
          <ShareModal
            title={quiz.title}
            description={quiz.description}
            url={`/quizzes/${quiz.id}`}
          >
            <Button
              size='icon'
              variant='outline'
              className='border-border'
              aria-label={`Share ${quiz.title}`}
            >
              <Share2 className='w-4 h-4' />
            </Button>
          </ShareModal>
        </div>
      </div>
    </article>
  )
}
