'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { Label } from '@/components/ui/Label'
import { Slider } from '@/components/ui/Slider'
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup'
import QuizCardCompact from '@/features/quizzes/components/QuizCard/QuizCardCompact'
import { getQuizzes } from '@/lib/api'
import { useCursorPaginated } from '@/lib/api'
import type { CursorFetcher } from '@/lib/api'
import type { QuizListItemDto } from '@/lib/api/generated/schemas'
import { Button } from '@/components/ui/Button'

interface QuizCatalogMainContentProps {
  categorySlug?: string
  searchQuery: string
}

/**
 * Minimal item shape consumed by `<QuizCardCompact />` — narrowed from
 * `QuizListItemDto` so the hook's `T extends { id: string }` constraint
 * is satisfied (the SDK uses `quizId` as the unique identifier; we
 * surface it as `id` so the hook's `appendUniqueById` deduplication
 * works without an adapter layer). The original DTO is preserved on
 * `dto` for fields the card does not read.
 */
interface QuizCatalogItem {
  id: string
  title: string
  imageUrl: string | undefined
  difficulty: string | undefined
  dto: QuizListItemDto
}

interface FetcherParams {
  limit: number
  categoryId?: string
  difficulty?: 'easy' | 'medium' | 'hard'
}

/**
 * Fetcher adapter for the live `/quizzes` endpoint.
 *
 * This is the single, well-defined place in this file where the SDK
 * response's pagination meta is read (`data` / `meta.pagination`). The
 * contract is locked by Epic 3.2 / E2: the rest of the component
 * never sees `nextCursor` or `pagination`. Any future consumer that
 * needs the raw cursor for some reason must do the same here — at the
 * fetcher boundary — never in component state.
 */
const quizzesFetcher: CursorFetcher<QuizCatalogItem, FetcherParams> = async ({
  cursor,
  params
}) => {
  const sdk = getQuizzes()
  // Post-`unwrap` payload: `{ data: QuizListItemDto[], meta: { pagination: ... } }`.
  // Defensive narrowing keeps the contract narrow at the boundary; if the
  // SDK ever switches to a different envelope shape, the read here is the
  // only place to update.
  //
  // The `signal` arg from `CursorFetcher` is intentionally unused here:
  // the SDK call goes through orval's mutator which does not expose
  // AbortSignal forwarding. D4 race handling at the hook layer still
  // aborts in-flight fetches via `loadMoreAbortRef` — the hook checks
  // `signal?.aborted` BEFORE invoking this fetcher, so the cancellation
  // path is exercised; the SDK request simply completes in the background
  // and is discarded by SWR's per-page cache (which has already been
  // replaced by `refresh` / `loadMore`).
  const result = (await sdk.quizControllerListQuizzes({
    limit: params.limit,
    cursor: cursor ?? undefined,
    ...(params.categoryId !== undefined && { categoryId: params.categoryId }),
    ...(params.difficulty !== undefined && { difficulty: params.difficulty })
  })) as unknown as {
    data?: readonly QuizListItemDto[]
    meta?: { pagination?: PaginationMeta }
  }

  const rawItems = result.data ?? []
  const meta = result.meta?.pagination

  return {
    items: rawItems.map((quiz): QuizCatalogItem => ({
      id: quiz.quizId,
      title: quiz.title,
      imageUrl: quiz.imageUrl ?? undefined,
      difficulty: quiz.publishedVersion?.difficulty ?? undefined,
      dto: quiz
    })),
    nextCursor: meta?.nextCursor ?? null,
    hasNextPage: meta?.hasNextPage ?? false,
    limit: params.limit
  }
}

interface PaginationMeta {
  kind?: string
  limit?: number
  nextCursor: string | null
  hasNextPage: boolean
}

const QuizCatalogMainContent = memo(function QuizCatalogMainContent({
  categorySlug,
  searchQuery
}: QuizCatalogMainContentProps) {
  // Local UI state — filters the hook does NOT own. (The hook owns
  // pagination only; filter selection is component state because the
  // filter values are part of the SWR key — see the `key` array below.)
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [maxDuration, setMaxDuration] = useState<number[]>([60])
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  // The cursor-pagination primitive owns everything pagination-related.
  // No `useState` for cursor / hasMore / items — they all flow through
  // the hook now.
  //
  // Note: `searchQuery` is NOT forwarded to the SDK — the live
  // `/quizzes` endpoint does not expose a `search` query parameter
  // (the SDC's `QuizControllerListQuizzesParams` lacks one). It is
  // still included in the SWR `key` below so a future search-feature
  // rollout can drop the cache without changing the component's
  // external API.
  const fetcherParams: FetcherParams = {
    limit: 12,
    ...(categorySlug !== undefined && { categoryId: categorySlug }),
    ...(difficultyFilter !== 'all' && {
      difficulty: difficultyFilter as 'easy' | 'medium' | 'hard'
    })
  }

  const {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    error
  } = useCursorPaginated<QuizCatalogItem, FetcherParams>({
    key: [
      'quizzes',
      'catalog',
      categorySlug ?? '',
      searchQuery,
      difficultyFilter
    ],
    fetcher: quizzesFetcher,
    params: fetcherParams,
    paginationKind: 'cursor'
  })

  // IntersectionObserver — unchanged. Watches the sentinel and calls
  // `loadMore()` from the hook. No cursor state, no ref-tracked
  // previous-load flag, no inline fetch function.
  useEffect(() => {
    const element = loadMoreRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting && hasMore && !isLoading) {
          loadMore()
        }
      },
      { threshold: 0.2 }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [hasMore, isLoading, loadMore])

  if (isLoading) {
    return (
      <div className='text-foreground'>
        <div className='flex xl:flex-row flex-col gap-7'>
          <aside className='xl:w-[16rem] w-full rounded-xl'>
            <h2 className='text-xl font-bold mb-6'>Filters</h2>
            <div className='border border-border rounded-md p-4 space-y-5'>
              <div className='h-4 w-24 bg-muted rounded animate-pulse' />
              <div className='h-4 w-24 bg-muted rounded animate-pulse' />
            </div>
          </aside>
          <div className='flex-1'>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className='rounded-lg border bg-card p-4 animate-pulse'>
                  <div className='h-48 bg-muted rounded mb-4' />
                  <div className='h-4 w-3/4 bg-muted rounded mb-2' />
                  <div className='h-4 w-1/2 bg-muted rounded' />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='text-foreground'>
        <div className='text-center py-12' role='alert'>
          <p className='text-destructive text-lg mb-2'>
            {error.message || 'Failed to load quizzes'}
          </p>
          <p className='text-foreground/60 text-sm'>
            Please check that the backend server is running and try again.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='text-foreground'>
      <div className='flex xl:flex-row flex-col gap-7'>
        <aside
          className='xl:w-[16rem] w-full rounded-xl'
          aria-label='Quiz filters'
        >
          <h2 className='text-xl font-bold mb-6'>Filters</h2>

          <div className='border border-border rounded-md p-4 space-y-5'>
            <div>
              <p className='font-semibold mb-3'>Difficulty</p>
              <RadioGroup
                value={difficultyFilter}
                onValueChange={(value) => setDifficultyFilter(value)}
                aria-label='Filter by difficulty'
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='all' id='difficulty-all' />
                  <Label htmlFor='difficulty-all'>All levels</Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='easy' id='difficulty-easy' />
                  <Label htmlFor='difficulty-easy'>Easy</Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='medium' id='difficulty-medium' />
                  <Label htmlFor='difficulty-medium'>Medium</Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='hard' id='difficulty-hard' />
                  <Label htmlFor='difficulty-hard'>Hard</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <div className='flex justify-between mb-3'>
                <p className='font-semibold'>Duration</p>
                <p className='text-sm text-foreground/70'>
                  Up to {maxDuration[0]} min
                </p>
              </div>
              <Slider
                value={maxDuration}
                onValueChange={(value) => setMaxDuration(value)}
                min={5}
                max={60}
                step={5}
                className='w-full'
                aria-label='Maximum duration in minutes'
              />
            </div>

            <div>
              <p className='font-semibold mb-3'>Sort by</p>
              <RadioGroup
                value={sortBy}
                onValueChange={(value) => setSortBy(value)}
                aria-label='Sort quizzes'
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='newest' id='sort-newest' />
                  <Label htmlFor='sort-newest'>Newest</Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='most-popular' id='sort-popular' />
                  <Label htmlFor='sort-popular'>Most popular</Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='trending' id='sort-trending' />
                  <Label htmlFor='sort-trending'>Trending</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </aside>

        <div className='flex-1'>
          <div className='mb-6'>
            <p className='text-foreground/70 text-sm' aria-live='polite'>
              {items.length} quizzes found
            </p>
          </div>

          {items.length === 0 ? (
            <div className='text-center py-12'>
              <p className='text-muted-foreground'>No quizzes found matching your criteria.</p>
            </div>
          ) : (
            <div
              className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              role='list'
              aria-label='Quiz results'
            >
              {items.map((item) => (
                <QuizCardCompact
                  key={item.id}
                  id={item.dto.slug}
                  title={item.title}
                  image={item.imageUrl ?? '/placeholder.webp'}
                  difficulty={item.difficulty}
                />
              ))}
            </div>
          )}

          {hasMore && (
            <div className='mt-6 flex justify-center'>
              <Button
                variant='outline'
                onClick={loadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          )}

          <div ref={loadMoreRef} className='h-2' aria-hidden='true' />
        </div>
      </div>
    </div>
  )
})

export default QuizCatalogMainContent