import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Clock, Users, DollarSign, Star, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import SpotAvailabilityIndicator from '@/components/SpotAvailabilityIndicator'
import { difficultyColors } from '@/constants/difficultyColor'
import type { Quiz, QuizDifficulty } from '@/types/quiz'
import { ShareModal } from '@/components/share/ShareModal'

type CompactVariantProps = {
  variant: 'compact'
  id?: string
  title: string
  categories: string[]
  difficulty: string
  image: string
}

export type DifficultyVariantProps = {
  variant: 'difficulty'
  id?: string
  imageSrc: string
  difficulty: QuizDifficulty
  creatorImageURL: string
  creatorName: string
  reward: number
  category: string
  duration: number
  title: string
  currentPlayers: number
  spotsAvailable: number
  maxPlayers: number
}

type DetailVariantProps = {
  variant: 'detail'
  quiz: Quiz
}

export type QuizCardUnifiedProps =
  | CompactVariantProps
  | DifficultyVariantProps
  | DetailVariantProps

export default function QuizCardUnified(props: QuizCardUnifiedProps) {
  if (props.variant === 'compact') {
    return (
      <div className='rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:border-border'>
        <div className='relative h-48'>
          <Image
            src={props.image}
            alt={props.title}
            fill
            className='object-cover'
          />

          <div className='absolute inset-0 bg-linear-to-t from-black/60 to-transparent flex flex-col justify-end p-4'>
            <Badge
              className={`absolute top-3 left-3 z-10 ${
                difficultyColors[
                  props.difficulty as keyof typeof difficultyColors
                ].bg
              } text-white`}
            >
              {props.difficulty}
            </Badge>

            <h3 className='font-bold text-base text-white line-clamp-2'>
              {props.title}
            </h3>
          </div>
        </div>

        <div className='p-4 flex justify-between items-center'>
          {props.categories.length > 0 && (
            <div className='inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-semibold text-foreground bg-slate-50 dark:bg-slate-700'>
              {props.categories[0]}
            </div>
          )}
          <Button
            asChild
            className='bg-default hover:bg-default-hover text-white'
          >
            <Link href={props.id ? `/quizzes/${props.id}` : '/quizzes'}>
              Play Now
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  if (props.variant === 'detail') {
    const quiz = props.quiz
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
          <Badge
            className={`absolute top-3 left-3 ${
              difficultyColors[quiz.difficulty as keyof typeof difficultyColors]
                .bg
            } text-foreground`}
          >
            {quiz.difficulty}
          </Badge>
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
            <Avatar className='w-8 h-8 bg-main text-foreground'>
              <AvatarImage src={quiz.creator.imageURL || '/placeholder.svg'} />
              <AvatarFallback>{quiz.creator.name[0]}</AvatarFallback>
            </Avatar>
            <span className='text-foreground/70 text-sm'>
              {quiz.creator.name}
            </span>
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
              <span className='text-foreground font-semibold'>
                {quiz.rating}
              </span>
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

  const progress =
    ((props.maxPlayers - props.spotsAvailable) / props.maxPlayers) * 100
  const spotsText =
    props.spotsAvailable > 0
      ? `${props.spotsAvailable} spots available`
      : `Only ${props.maxPlayers - props.currentPlayers} spots left!`
  const isSpotsLow = props.spotsAvailable > 0 && props.spotsAvailable <= 10

  return (
    <div className='w-full overflow-hidden rounded-lg border border-border shadow-lg'>
      <div className='relative aspect-video w-full'>
        <Image
          src={props.imageSrc || '/placeholder.svg'}
          alt={props.title}
          fill
          className='object-cover'
          sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'
        />
        <div className='absolute inset-0 bg-linear-to-t from-black/70 to-transparent' />
        <div
          className={`absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-semibold text-white ${
            difficultyColors[props.difficulty as keyof typeof difficultyColors]
              .bg
          }`}
        >
          {props.difficulty}
        </div>
        <div className='absolute bottom-3 left-3 flex items-center gap-2'>
          <Avatar className='h-10 w-10 border-2 border-white'>
            <AvatarImage
              src={props.creatorImageURL || '/placeholder.svg'}
              alt={props.creatorName}
            />
            <AvatarFallback>
              {props.creatorName
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
          <span className='font-semibold text-white'>{props.creatorName}</span>
        </div>
        <div className='absolute bottom-3 right-3 flex flex-col items-center text-sm font-semibold text-white'>
          <span>Reward</span>
          <div className='flex items-center justify-center'>
            <DollarSign className='mr-1 h-4 w-4 text-green-400' />
            <span className='text-green-400'>{props.reward}</span>
          </div>
        </div>
      </div>
      <div className='p-4 text-white'>
        <div className='mb-2 flex items-center justify-between text-sm text-gray-400'>
          <span className='rounded-full text-foreground border border-border px-2 py-0.5 text-xs'>
            {props.category}
          </span>
          <div className='flex items-center'>
            <Clock className='mr-1 h-4 w-4' />
            {props.duration} min
          </div>
        </div>
        <h3 className='mb-3 text-lg text-foreground font-bold'>
          {props.title}
        </h3>
        <div className='mb-3 flex items-center text-sm text-gray-400'>
          <Users className='mr-2 h-4 w-4 text-foreground' />
          <span className='text-foreground'>
            {props.currentPlayers} players
          </span>
        </div>
        <div className='mb-3'>
          <Progress value={progress} className='h-2' />
        </div>
        <p
          className={`mb-4 text-sm ${
            isSpotsLow ? 'text-orange-400' : 'text-gray-400'
          }`}
        >
          {spotsText}
        </p>
        <Button className='w-full bg-default hover:bg-default-hover'>
          Start Quiz
        </Button>
      </div>
    </div>
  )
}
