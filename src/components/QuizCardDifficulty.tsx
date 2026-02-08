import Image from 'next/image'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Clock, Users, DollarSign } from 'lucide-react'
import { difficultyColors } from '@/constants/difficultyColor'

export interface QuizCardProps {
  id?: string
  imageSrc: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  authorAvatarSrc: string
  authorName: string
  reward: number
  category: string
  duration: number
  title: string
  players: number
  spotsAvailable: number
  totalSpots: number
}

export function QuizCardDifficulty({
  imageSrc,
  difficulty,
  authorAvatarSrc,
  authorName,
  reward,
  category,
  duration,
  title,
  players,
  spotsAvailable,
  totalSpots
}: QuizCardProps) {
  const progress = ((totalSpots - spotsAvailable) / totalSpots) * 100
  const spotsText =
    spotsAvailable > 0
      ? `${spotsAvailable} spots available`
      : `Only ${totalSpots - players} spots left!`
  const isSpotsLow = spotsAvailable > 0 && spotsAvailable <= 10

  return (
    <div className='w-full overflow-hidden rounded-lg border border-gray-300 dark:border-slate-700 shadow-lg'>
      <div className='relative aspect-video w-full'>
        <Image
          src={imageSrc || '/placeholder.svg'}
          alt={title}
          fill
          className='object-cover'
          sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'
        />
        <div className='absolute inset-0 bg-linear-to-t from-black/70 to-transparent' />
        <div
          className={`absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-semibold text-white ${
            difficultyColors[difficulty as keyof typeof difficultyColors]
          }`}
        >
          {difficulty}
        </div>
        <div className='absolute bottom-3 left-3 flex items-center gap-2'>
          <Avatar className='h-10 w-10 border-2 border-white'>
            <AvatarImage
              src={authorAvatarSrc || '/placeholder.svg'}
              alt={authorName}
            />
            <AvatarFallback>
              {authorName
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
          <span className='font-semibold text-white'>{authorName}</span>
        </div>
        <div className='absolute bottom-3 right-3 flex flex-col items-center text-sm font-semibold text-white'>
          <span>Reward</span>
          <div className='flex items-center justify-center'>
            <DollarSign className='mr-1 h-4 w-4 text-green-400' />
            <span className='text-green-400'>{reward}</span>
          </div>
        </div>
      </div>
      <div className='p-4 text-white'>
        <div className='mb-2 flex items-center justify-between text-sm text-gray-400'>
          <span className='rounded-full text-foreground border border-gray-300 dark:border-slate-700 px-2 py-0.5 text-xs'>
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
          <span className='text-foreground'>{players} players</span>
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
