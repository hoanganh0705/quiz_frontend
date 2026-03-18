import Image from 'next/image'
import Link from 'next/link'
import { Card } from '@/components/ui/card'

interface QuizCategoryProps {
  id: string
  name: string
  count: number
  slug?: string
}

function QuizCategoriesCard({ id, name, count, slug }: QuizCategoryProps) {
  const href = `/quizzes?category=${encodeURIComponent(slug ?? id)}`

  return (
    <Link
      href={href}
      className='block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg'
      role='listitem'
      aria-label={`Open ${name} category with ${count} quizzes`}
    >
      <Card
        key={id}
        className='border bg-card text-card-foreground cursor-pointer hover:scale-105 transition-transform duration-200 relative overflow-hidden group p-0'
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
            <span
              className='text-white font-bold text-[12px]'
              aria-hidden='true'
            >
              {count}
            </span>
          </div>
          {/* Category name overlay for accessibility */}
          <div className='absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent p-3'>
            <h3 className='text-white font-semibold text-sm truncate'>
              {name}
            </h3>
          </div>
        </div>
      </Card>
    </Link>
  )
}

export default QuizCategoriesCard
