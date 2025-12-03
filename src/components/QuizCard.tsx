import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { difficultyColors } from '@/constants/difficultColor'
import { Badge } from '@/components/ui/badge'

interface QuizCardProps {
  title: string
  categories: string[]
  difficulty: string
  image: string
}

const QuizCard = ({ title, categories, difficulty, image }: QuizCardProps) => {
  return (
    <div className='rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600'>
      <div className='relative h-48'>
        <Image src={image} alt={title} fill className='object-cover' />

        {/* Overlay */}
        <div className='absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4'>
          {/* Badge */}
          <Badge
            className={`absolute top-3 left-3 z-10 ${
              difficultyColors[difficulty as keyof typeof difficultyColors].bg
            } text-white`}
          >
            {difficulty}
          </Badge>

          {/* Title */}
          <h3 className='font-bold text-base text-white line-clamp-2'>
            {title}
          </h3>
        </div>
      </div>

      {/* Bottom Section */}
      <div className='p-4 flex justify-between items-center'>
        <div
          key={categories[0]}
          className='inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-semibold text-foreground bg-slate-50 dark:bg-slate-700'
        >
          {categories[0]}
        </div>
        <Button className='bg-default hover:bg-default-hover text-white'>
          Play Now
        </Button>
      </div>
    </div>
  )
}

export default QuizCard
