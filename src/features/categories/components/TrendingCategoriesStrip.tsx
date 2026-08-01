'use client'

/**
 * `<TrendingCategoriesStrip />` — horizontal scroll of `<CategoryCard />`
 * items above the directory grid.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source ticket: TKT-3.3.C2.
 *
 * Consumes `useCategoriesTrending({ limit: 10 })`. The strip is
 * supplementary — an empty trending list does NOT block the ranked
 * grid below it (the strip renders nothing in the empty case).
 *
 * ## State contract
 *
 * | State                | Render                                                     |
 * | -------------------- | ---------------------------------------------------------- |
 * | `isLoading`          | 5 skeleton cards, identical outer dimensions (no CLS).     |
 * | `categories.length === 0` and not loading | Nothing (the strip is hidden). |
 * | `error`              | An inline retry button; the underlying grid below is unaffected. |
 * | resolved             | Up to 10 `<CategoryCard />` items in a horizontal scroll. |
 *
 * The strip is a client component because it consumes the SWR hook.
 * The retry button calls `mutate` on the SWR key (no SWR ref required —
 * we use the global `mutate` from `swr`).
 */

import { mutate } from 'swr'

import { CategoryCard } from './CategoryCard'
import { CategoryCardSkeleton } from '@/components/primitives'
import { useCategoriesTrending } from '@/features/categories/hooks'
import { rankedCategoryToCategoryResponse } from '@/features/categories/utils/ranked-category-to-category-response'
import { Button } from '@/components/ui/Button'

const SWR_KEY = ['categories', 'trending', { limit: 10 }] as const

const STRIP_CONTAINER = 'flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory'
const STRIP_HEADER =
  'mb-4 flex items-center justify-between gap-2 text-sm text-muted-foreground'

export function TrendingCategoriesStrip(): React.ReactElement | null {
  const { categories, isLoading, error } = useCategoriesTrending({
    limit: 10,
  })

  // Loading state — 5 skeletons, identical outer dimensions to the
  // resolved cards. CLS = 0 once items arrive.
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

  // Error state — inline retry button. The grid below is unaffected.
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

  // Empty state — render nothing. The strip is supplementary; an
  // empty trending list does not block the ranked grid below.
  if (categories.length === 0) {
    return null
  }

  // Resolved state — up to 10 cards in a horizontal scroll.
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
