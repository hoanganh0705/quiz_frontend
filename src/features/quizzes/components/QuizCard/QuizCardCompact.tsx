import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { QuizCardDifficultyBadge } from './shared/QuizCardDifficultyBadge'

export interface QuizCardCompactProps {
  id?: string
  title: string
  categories: string[]
  difficulty: string
  image: string
}

export default function QuizCardCompact({
  id,
  title,
  categories,
  difficulty,
  image
}: QuizCardCompactProps) {
  return (
    <div className='rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:border-border'>
      <div className='relative h-48'>
        <Image src={image} alt={title} fill className='object-cover' />

        <div className='absolute inset-0 bg-linear-to-t from-black/60 to-transparent flex flex-col justify-end p-4'>
          <QuizCardDifficultyBadge
            difficulty={difficulty}
            className='absolute top-3 left-3 z-10 text-white'
          />

          <h3 className='font-bold text-base text-white line-clamp-2'>
            {title}
          </h3>
        </div>
      </div>

      <div className='p-4 flex justify-between items-center'>
        {categories.length > 0 && (
          <div className='inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-semibold text-foreground bg-slate-50 dark:bg-slate-700'>
            {categories[0]}
          </div>
        )}
        <Button asChild className='bg-default hover:bg-default-hover text-white'>
          <Link href={id ? `/quizzes/${id}` : '/quizzes'}>Play Now</Link>
        </Button>
      </div>
    </div>
  )
}
