import Image from 'next/image'
import { Clock, Users, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import type { QuizDifficulty } from '@/features/quizzes/types'
import { QuizCardDifficultyBadge } from './shared/QuizCardDifficultyBadge'
import { QuizCardCreator } from './shared/QuizCardCreator'

export interface QuizCardDifficultyProps {
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

export function QuizCardDifficulty({
  imageSrc,
  difficulty,
  creatorImageURL,
  creatorName,
  reward,
  category,
  duration,
  title,
  currentPlayers,
  spotsAvailable,
  maxPlayers
}: QuizCardDifficultyProps) {
  const progress = ((maxPlayers - spotsAvailable) / maxPlayers) * 100
  const spotsText =
    spotsAvailable > 0
      ? `${spotsAvailable} spots available`
      : `Only ${maxPlayers - currentPlayers} spots left!`
  const isSpotsLow = spotsAvailable > 0 && spotsAvailable <= 10

  return (
    <div className='w-full overflow-hidden rounded-lg border border-border shadow-lg'>
      <div className='relative aspect-video w-full'>
        <Image
          src={imageSrc || '/placeholder.svg'}
          alt={title}
          fill
          className='object-cover'
          sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'
        />
        <div className='absolute inset-0 bg-linear-to-t from-black/70 to-transparent' />
        <QuizCardDifficultyBadge
          difficulty={difficulty}
          asDiv
          className='absolute top-3 right-3 text-white'
        />
        <QuizCardCreator
          imageURL={creatorImageURL}
          name={creatorName}
          avatarClassName='h-10 w-10 border-2 border-white'
          nameClassName='font-semibold text-white'
          containerClassName='absolute bottom-3 left-3 flex items-center gap-2'
        />
        <div className='absolute bottom-3 right-3 flex flex-col items-center text-sm font-semibold text-white'>
          <span>Reward</span>
          <div className='flex items-center justify-center'>
            <DollarSign className='mr-1 h-4 w-4 text-green-400' />
            <span className='text-green-400'>{reward}</span>
          </div>
        </div>
      </div>
      <div className='p-4 bg-background text-foreground'>
        <div className='mb-2 flex items-center justify-between text-sm text-gray-400'>
          <span className='rounded-full text-foreground border border-border px-2 py-0.5 text-xs'>
            {category}
          </span>
          <div className='flex items-center'>
            <Clock className='mr-1 h-4 w-4' />
            {duration} min
          </div>
        </div>
        <h3 className='mb-3 text-lg text-foreground font-bold'>{title}</h3>
        <div className='mb-3 flex items-center text-sm text-gray-400'>
          <Users className='mr-2 h-4 w-4 text-foreground' />
          <span className='text-foreground'>{currentPlayers} players</span>
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
        <Button className='w-full bg-brand hover:bg-brand'>
          Start Quiz
        </Button>
      </div>
    </div>
  )
}
