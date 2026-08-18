'use client'

import { mutate } from 'swr'

import { CategoryCard } from './CategoryCard'
import { CategoryCardSkeleton } from '@/components/primitives'
import { useCategoriesTrending } from '@/features/categories/hooks'
import { rankedCategoryToCategoryResponse } from '@/features/categories/utils/ranked-category-to-category-response'
import { Button } from '@/components/ui/Button'

const SWR_KEY = ['categories', 'trending', { limit: 10 }] as const

const STRIP_CONTAINER = 'flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scroll-mt-16'
const STRIP_HEADER =
'mb-4 flex items-center justify-between gap-2 text-sm text-muted-foreground'

export function TrendingCategoriesStrip(): React.ReactElement | null {
const { categories, isLoading, error } = useCategoriesTrending({
limit: 10,
  })

if (isLoading) {
return (
<section
className='mb-8'
aria-label='Trending categories'
aria-busy='true'
      >
<div className={STRIP_HEADER}>
<span>Trending now</span>
</div>
<div className={STRIP_CONTAINER}>
{Array.from({ length: 5 }).map((_, i) => (
<div
key={i}
className='w-64 shrink-0 snap-start'
data-testid='trending-strip-skeleton'
            >
<CategoryCardSkeleton />
</div>
          ))}
</div>
</section>
    )
  }

if (error) {
return (
<section className='mb-8' aria-label='Trending categories'>
<div className={STRIP_HEADER}>
<span>Trending now</span>
<Button
variant='outline'
size='sm'
onClick={() => void mutate(SWR_KEY)}
data-testid='trending-strip-retry'
          >
Retry
          </Button>
</div>
<p className='text-sm text-muted-foreground' role='status'>
Couldn&apos;t load trending categories.
        </p>
</section>
    )
  }

if (categories.length === 0) {
return null
  }

return (
<section
className='mb-8'
aria-label='Trending categories'
data-testid='trending-strip'
    >
<div className={STRIP_HEADER}>
<span>Trending now</span>
</div>
<div className={STRIP_CONTAINER}>
{categories.map((ranked) => (
<div
key={ranked.categoryId}
className='w-64 shrink-0 snap-start'
          >
<CategoryCard
category={rankedCategoryToCategoryResponse(ranked)}
            />
</div>
        ))}
</div>
</section>
  )
}
