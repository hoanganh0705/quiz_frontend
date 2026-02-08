import React, { memo } from 'react'

import { Clock, Users, DollarSign, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Image from 'next/image'
import Link from 'next/link'
import SpotAvailabilityIndicator from '@/components/SpotAvailabilityIndicator'
import { difficultyColors } from '@/constants/difficultyColor'
import { Quiz } from '@/types/quiz'

const QuizCardDetail = memo(function QuizCardDetail(props: Quiz) {
  return (
    <article
      role='listitem'
      className='border border-gray-300 dark:border-slate-700 rounded-xl overflow-hidden'
    >
      <div className='relative h-48'>
        <Image
          src={props.image}
          alt={`${props.title} quiz cover`}
          fill
          className='object-cover'
          loading='lazy'
        />
        <Badge
          className={`absolute top-3 left-3 ${
            difficultyColors[props.difficulty as keyof typeof difficultyColors]
              .bg
          } text-foreground`}
        >
          {props.difficulty}
        </Badge>
        <div className='absolute top-3 right-3 bg-transparent text-white rounded-full px-2 py-1 flex items-center gap-1 text-sm'>
          <Clock className='w-3 h-3' aria-hidden='true' />
          <span>{props.duration}</span>
        </div>
      </div>

      <div className='p-4'>
        <h3 className='font-bold text-lg mb-3 text-foreground truncate overflow-hidden'>
          {props.title}
        </h3>

        <div className='flex items-center gap-3 mb-3'>
          <Avatar className='w-8 h-8 bg-main text-foreground'>
            <AvatarImage src={props.creator.imageURL || '/placeholder.svg'} />
            <AvatarFallback>{props.creator.name[0]}</AvatarFallback>
          </Avatar>
          <span className='text-foreground/70 text-sm'>
            {props.creator.name}
          </span>
          <Badge className='dark:bg-main bg-[#f8fafc] text-foreground border border-gray-300 dark:border-slate-700'>
            {props.categories.join(', ')}
          </Badge>
        </div>

        <div className='flex items-center justify-between mb-3'>
          <div className='flex items-center gap-1'>
            <Star
              className='w-4 h-4 fill-yellow-400 text-yellow-400'
              aria-hidden='true'
            />
            <span className='text-foreground font-semibold'>
              {props.rating}
            </span>
            <span className='text-foreground/70 text-sm'>
              ({props.quizReview.length} reviews)
            </span>
          </div>
          <div className='flex items-center gap-1 text-green-400 font-bold'>
            <DollarSign className='w-4 h-4' aria-hidden='true' />
            {props.reward.toFixed(2)}
          </div>
        </div>

        <div className='flex items-center justify-between gap-4 mb-4 text-sm text-slate-400'>
          <div className='flex items-center gap-1'>
            <Users className='w-4 h-4' aria-hidden='true' />
            {props.players} players
          </div>
          <div className='flex items-center gap-1'>
            <div>{props.spotsLeft} spots left</div>
            <SpotAvailabilityIndicator
              currentSpots={props.spots - props.spotsLeft}
              totalSpots={props.spots}
              mode='default'
            />
          </div>
        </div>

        {props.almostFull ? (
          <p className='text-red-400 text-sm mb-3' aria-live='polite'>
            Almost full! Only {props.spotsLeft} spots left
          </p>
        ) : null}

        <Button
          className='w-full bg-default hover:bg-default-hover text-white'
          asChild
        >
          <Link
            href={`/quizzes/${props.id}/start`}
            aria-label={`Play ${props.title}`}
          >
            Play Now
          </Link>
        </Button>
      </div>
    </article>
  )
})

export default QuizCardDetail
