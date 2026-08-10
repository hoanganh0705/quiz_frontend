'use client'

/**
 * `<CategoriesDirectoryPage />` — the `/categories` route's main
 * composition.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source tickets: TKT-3.3.D2, TKT-3.3.E1.
 *
 * Wires:
 *   - The legacy search input (E1) — a 250 ms-debounced
 *     `<Input>` element that filters the ranked grid by name.
 *   - `<TrendingCategoriesStrip />` above the grid.
 *   - The ranked grid of `<CategoryCard />` items.
 *   - `<CategoryEmptyState variant="directory" />` when the ranked
 *     list is empty AND the search input is empty.
 *   - The search-specific empty state when the user has typed a
 *     query that produces zero matches.
 *   - The legacy `<TestKnowledge />` and `<HowItWorks />` blocks below
 *     the grid (preserving the existing page layout).
 *
 * ## Ranked endpoint is non-paginated (Epic 3.3 A1 §1)
 *
 * The planning doc said "first page = 20, subsequent pages via
 * `loadMore`". That contradicts the wire shape: `/categories/popular`
 * has no `meta.pagination` (it's a `WrappedDto`, not a
 * `WrappedPaginatedDto` per A1 §3). The grid therefore renders the
 * up-to-100 items the wrapper returns and does NOT expose a load-more
 * button. If a future endpoint exposes cursor pagination for the
 * ranked list, this ticket's grid is the only call site to update.
 *
 * ## Search semantics (E1)
 *
 * The search is client-side. The filter is case-insensitive and
 * matches `category.name.toLowerCase().includes(query.toLowerCase())`
 * — same as the legacy page's behaviour. The 250 ms debounce prevents
 * re-render storms when the user types quickly.
 *
 * The search affects ONLY the ranked grid. The trending strip above
 * the grid is supplementary and is NOT filtered — the strip is what
 * other surfaces (home rails in Story 3.7) consume, and filtering it
 * would defeat its purpose.
 *
 * When the user has typed a non-empty query and the filter produces
 * zero matches, the page renders the search-specific empty state
 * (`"No categories found matching your search."`) INSTEAD OF the
 * generic `CategoryEmptyState`. The `CategoryEmptyState` is only
 * shown when the underlying list is empty AND the user has not
 * typed anything.
 *
 * ## Layout preservation
 *
 * The grid uses the same Tailwind breakpoints as the legacy page
 * (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6`).
 * The legacy page's skeleton count is 10; the cards have changed
 * outer dimensions under the Story 3.1 primitive, so the skeleton
 * count is now 9 (3 rows × 3 columns → 9, matching the Story 3.3
 * line 329 acceptance criterion).
 */

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import { CategoryCard } from './CategoryCard'
import { CategoryCardSkeleton } from '@/components/primitives'
import { CategoryEmptyState } from './CategoryEmptyState'
import { TrendingCategoriesStrip } from './TrendingCategoriesStrip'
import TestKnowledge from './TestKnowledge'
import { HowItWorks } from '@/features/marketing'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCategoriesRanked } from '@/features/categories/hooks'
import { rankedCategoryToCategoryResponse } from '@/features/categories/utils/ranked-category-to-category-response'
import { useDebouncedValue } from '@/lib/utils/use-debounced-value'
import { mutate } from 'swr'

const SWR_KEY = ['categories', 'ranked', { limit: 100 }] as const
const SEARCH_DEBOUNCE_MS = 250

const GRID_LAYOUT = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6'

export function CategoriesDirectoryPage(): React.ReactElement {
  const { categories, isLoading, error } = useCategoriesRanked({
    limit: 100,
  })

  // Search input — local state is the typed value (updates on every
  // keystroke); the debounced value is the applied query (updates
  // 250 ms after the last keystroke).
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedQuery = useDebouncedValue(searchTerm, SEARCH_DEBOUNCE_MS).debouncedValue

  const filteredCategories = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase()
    if (!query) return categories
    return categories.filter((category) =>
      category.name.toLowerCase().includes(query),
    )
  }, [categories, debouncedQuery])

  return (
    <div
      className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'
      data-testid='categories-directory-page'
    >
      <header className='mb-8'>
        <h1 className='text-3xl font-bold mb-4 text-foreground'>
          Quiz Categories
        </h1>
        <p className='text-foreground/70 text-base mb-6'>
          Browse all quiz categories and find quizzes that match your interests.
        </p>
        <div className='relative max-w-md'>
          <Search
            className='absolute left-3 top-1/2 -translate-y-1/2 text-foreground/70 w-5 h-5'
            aria-hidden='true'
          />
          <Input
            type='search'
            placeholder='Search categories…'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='pl-10 bg-background border-border text-foreground placeholder-foreground/70 focus:border-ring'
            aria-label='Search quiz categories'
            autoComplete='off'
            spellCheck={false}
            data-testid='categories-directory-search-input'
          />
        </div>
      </header>

      <TrendingCategoriesStrip />

      {isLoading ? (
        <div
          className={GRID_LAYOUT}
          aria-label='Loading categories'
          aria-busy='true'
          data-testid='categories-directory-loading'
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <CategoryCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div
          className='text-center py-12'
          role='alert'
          data-testid='categories-directory-error'
        >
          <p className='text-destructive text-lg mb-4'>
            Could not load categories. Please try again.
          </p>
          <Button
            variant='outline'
            onClick={() => void mutate(SWR_KEY)}
            data-testid='categories-directory-retry'
          >
            Retry
          </Button>
        </div>
      ) : categories.length === 0 ? (
        <CategoryEmptyState variant='directory' />
      ) : filteredCategories.length === 0 ? (
        <div
          className='text-center py-12'
          role='status'
          aria-live='polite'
          data-testid='categories-directory-search-empty'
        >
          <p className='text-foreground/70 text-lg'>
            No categories found matching your search.
          </p>
        </div>
      ) : (
        <div
          className={GRID_LAYOUT}
          role='list'
          aria-label='Quiz categories'
          data-testid='categories-directory-grid'
        >
          {filteredCategories.map((ranked) => (
            <CategoryCard
              key={ranked.categoryId}
              category={rankedCategoryToCategoryResponse(ranked)}
            />
          ))}
        </div>
      )}

      <TestKnowledge />
      <HowItWorks />
    </div>
  )
}
