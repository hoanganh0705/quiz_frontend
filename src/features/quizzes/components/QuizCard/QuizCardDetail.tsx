import Image from 'next/image'
import Link from 'next/link'
import { Clock, Users, Star, Share2, Coins } from 'lucide-react'
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
      className='group bg-card text-card-foreground border border-border/80 rounded-xl overflow-hidden shadow-xs hover:shadow-lg hover:shadow-brand/10 hover:border-brand/40 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between'
    >
      <div>
        <div className='relative h-48 overflow-hidden'>
          <Image
            src={quiz.image}
            alt={`${quiz.title} quiz cover`}
            fill
            className='object-cover group-hover:scale-105 transition-transform duration-300'
            loading='lazy'
          />
          <QuizCardDifficultyBadge
            difficulty={quiz.difficulty}
            className='absolute top-3 left-3 text-foreground shadow-xs'
          />
          <div className='absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white font-mono rounded-full px-2.5 py-1 flex items-center gap-1.5 text-xs font-medium shadow-xs'>
            <Clock className='w-3 h-3 text-white/80' aria-hidden='true' />
            <span>{quiz.duration}</span>
          </div>
        </div>

        <div className='p-4'>
          <h3 className='font-bold text-lg mb-3 text-foreground truncate overflow-hidden group-hover:text-brand transition-colors'>
            {quiz.title}
          </h3>

          <div className='flex items-center gap-3 mb-3'>
            <QuizCardCreator
              imageURL={quiz.creator.imageURL}
              name={quiz.creator.name}
              avatarClassName='w-8 h-8 bg-main text-foreground'
              nameClassName='text-muted-foreground text-sm'
            />
            <Badge className='dark:bg-main bg-[#f8fafc] text-foreground border border-border text-xs'>
              {quiz.categories.join(', ')}
            </Badge>
          </div>

          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-1'>
              <Star
                className='w-4 h-4 fill-amber-400 text-amber-400'
                aria-hidden='true'
              />
              <span className='text-foreground font-semibold font-mono text-sm'>{quiz.rating}</span>
              <span className='text-muted-foreground text-xs'>
                ({quiz.quizReview.length} reviews)
              </span>
            </div>
            <div className='flex items-center gap-1 text-amber-500 font-bold font-mono text-sm'>
              <Coins className='w-3.5 h-3.5 fill-amber-500/20' aria-hidden='true' />
              {quiz.reward.toFixed(0)}
            </div>
          </div>

          <div className='flex items-center justify-between gap-4 mb-4 text-xs text-muted-foreground'>
            <div className='flex items-center gap-1'>
              <Users className='w-3.5 h-3.5' aria-hidden='true' />
              <span>{quiz.currentPlayers} players</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <span>{quiz.spotsLeft} spots left</span>
              <SpotAvailabilityIndicator
                currentSpots={quiz.maxPlayers - quiz.spotsLeft}
                totalSpots={quiz.maxPlayers}
                mode='default'
              />
            </div>
          </div>

          {quiz.almostFull ? (
            <p className='text-rose-500 text-xs font-medium mb-3' aria-live='polite'>
              Almost full! Only {quiz.spotsLeft} spots left
            </p>
          ) : null}
        </div>
      </div>

      <div className='px-4 pb-4 pt-0'>
        <div className='flex gap-2'>
          <Button
            className='flex-1 bg-brand hover:bg-brand-hover text-white rounded-lg transition-colors font-medium text-sm'
            asChild
          >
            <Link
              href={`/quizzes/${quiz.id}/attempt`}
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
              className='border-border rounded-lg hover:border-brand/40 transition-colors'
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
