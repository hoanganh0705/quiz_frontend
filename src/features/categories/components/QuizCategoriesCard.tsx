import Image from 'next/image'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'

interface QuizCategoryProps {
  id: string
  name: string
  slug?: string
  count?: number
  description?: string | null
  imageUrl?: string
}

function QuizCategoriesCard({
  id,
  name,
  slug,
  count,
  description,
  imageUrl,
}: QuizCategoryProps) {
  const href = `/quizzes?category=${encodeURIComponent(slug ?? id)}`

  return (
    <Link
      href={href}
      className='block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg'
      role='listitem'
      aria-label={`Open ${name} category`}
    >
      <Card
        className='border bg-card text-card-foreground cursor-pointer hover:scale-105 transition-transform duration-200 relative overflow-hidden group p-0'
      >
        <div className='relative h-48 w-full overflow-hidden rounded-t-lg'>
          <Image
            src={imageUrl ?? '/placeholder.webp'}
            alt={`${name} category`}
            fill
            sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw'
            className='object-cover'
          />
          {count !== undefined && (
            <div
              className='absolute top-2 right-2 bg-black/20 backdrop-blur-sm rounded-full w-6 h-6 flex items-center justify-center z-10'
              aria-label={`${count} quizzes in this category`}
            >
              <span className='text-white font-bold text-[12px]' aria-hidden='true'>
                {count}
              </span>
            </div>
          )}
          <div className='absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent p-3'>
            <h3 className='text-white font-semibold text-sm truncate'>
              {name}
            </h3>
            {description && (
              <p className='text-white/70 text-xs mt-1 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
                {description}
              </p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}

export default QuizCategoriesCard
