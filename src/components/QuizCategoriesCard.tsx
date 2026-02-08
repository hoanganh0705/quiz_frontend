import { memo } from 'react' // rerender-memo
import Image from 'next/image'
import { Card } from '@/components/ui/card'

interface QuizCategoryProps {
  id: number
  name: string
  count: number
}

// Memoize card component (rerender-memo)
const QuizCategoriesCard = memo(function QuizCategoriesCard({
  id,
  name,
  count
}: QuizCategoryProps) {
  return (
    <Card
      key={id}
      className='border bg-card text-card-foreground cursor-pointer hover:scale-105 transition-transform duration-200 relative overflow-hidden group p-0'
      role='listitem'
    >
      {/* Image container - now fills the space and clips content */}
      <div className='relative h-48 w-full overflow-hidden rounded-t-lg'>
        <Image
          src='/placeholder.webp'
          alt={`${name} category`}
          fill
          sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw'
          className='object-cover'
        />
        {/* Count badge - positioned absolutely over the image */}
        <div
          className='absolute top-2 right-2 bg-black/20 backdrop-blur-sm rounded-full w-6 h-6 flex items-center justify-center z-10'
          aria-label={`${count} quizzes in this category`}
        >
          <span className='text-white font-bold text-[12px]' aria-hidden='true'>
            {count}
          </span>
        </div>
        {/* Category name overlay for accessibility */}
        <div className='absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent p-3'>
          <h3 className='text-white font-semibold text-sm truncate'>{name}</h3>
        </div>
      </div>
    </Card>
  )
})

export default QuizCategoriesCard
