'use client'

/**
 * `<TagsDirectoryPage>` — the `/tags` route's main composition.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.D2.
 *
 * Wires:
 *   - `<PopularTagsStrip />` (C2) above the grid.
 *   - `<TrendingTagsStrip />` (C3) below the popular strip.
 *   - `<TagFilterInput />` (C1) below the trending strip.
 *   - The cursor-paginated directory grid (`useTagsDirectory` from E1) — debounced filter + cursor pagination.
 *   - `<TagEmptyState variant="directory" />` when the underlying list is empty AND the filter is empty.
 *   - `<TagEmptyState variant="filter-no-match" query={query} onClearFilter={...} />` when the filter has no matches.
 *
 * ## Search semantics (E1)
 *
 * The search is client-side. The filter is applied to the current
 * page's items (the cursor primitive does NOT load additional
 * pages to satisfy the filter — Story 3.4 line 472). The 250 ms
 * debounce is implemented inside `useTagsDirectory` (the hook owns
 * the debounce, mirroring `useDebouncedValue`); the filter input
 * is fully controlled by the page.
 *
 * When the user has typed a non-empty query and the filter produces
 * zero matches, the page renders the filter-specific empty state
 * (`TagEmptyState variant="filter-no-match"`) which surfaces a
 * "Clear filter" action that resets the page's filter state.
 *
 * The filter affects ONLY the directory grid. The popular +
 * trending strips above it are supplementary and are NOT filtered.
 *
 * ## Layout
 *
 * The grid renders 30 pills per page (matching Story 3.4 AC #6 —
 * "Lighthouse on `/tags` with 30 items"). The cursor pagination
 * for the directory increments via the Load-more button. The grid
 * uses the Story 3.1 `TagPillSkeleton` for first-load + load-more.
 *
 * The component is a client component because it consumes the SWR
 * hook and holds the local filter state.
 */

import { useCallback, useState } from 'react'
import { mutate } from 'swr'

import { TagPill } from '@/components/primitives/TagPill/TagPill'
import { TagPillSkeleton } from '@/components/primitives'
import { Button } from '@/components/ui/Button'
import { useTagsDirectory } from '@/features/tags/hooks/useTagsDirectory'

import { PopularTagsStrip } from './PopularTagsStrip'
import { TrendingTagsStrip } from './TrendingTagsStrip'
import { TagFilterInput } from './TagFilterInput'
import { TagEmptyState } from './TagEmptyState'

const PAGE_LIMIT = 30
const DIRECTORY_SWR_KEY_FACTORY = (filter: string) =>
  ['tags', 'directory', filter, { limit: PAGE_LIMIT }] as const

const GRID_LAYOUT = 'flex flex-wrap gap-3'

export function TagsDirectoryPage(): React.ReactElement {
  // Filter state held by the page. The debounced value is consumed
  // by `useTagsDirectory` (the hook owns the debounce).
  const [filter, setFilter] = useState('')

  const { items, isLoading, isLoadingMore, hasMore, loadMore, error } =
    useTagsDirectory({ filter, limit: PAGE_LIMIT })

  const handleClearFilter = useCallback(() => {
    setFilter('')
  }, [])

  return (
    <div
      className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'
      data-testid='tags-directory-page'
    >
      <header className='mb-6'>
        <h1
          className='text-3xl font-bold mb-3 text-foreground'
          data-testid='tags-directory-page-title'
        >
          Tags
        </h1>
        <p className='text-foreground-secondary text-base mb-6'>
          Browse tags to discover quizzes by topic.
        </p>
        <div className='max-w-md'>
          <TagFilterInput
            value={filter}
            onChange={setFilter}
          />
        </div>
      </header>

      <PopularTagsStrip />
      <TrendingTagsStrip />

      {isLoading ? (
        <div
          className={GRID_LAYOUT}
          aria-label='Loading tags'
          aria-busy='true'
          data-testid='tags-directory-page-loading'
        >
          {Array.from({ length: PAGE_LIMIT }).map((_, i) => (
            <TagPillSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div
          className='text-center py-12'
          role='alert'
          data-testid='tags-directory-page-error'
        >
          <p className='text-destructive text-lg mb-4'>
            Could not load tags. Please try again.
          </p>
          <Button
            variant='outline'
            onClick={() => void mutate(DIRECTORY_SWR_KEY_FACTORY(filter))}
            data-testid='tags-directory-page-retry'
          >
            Retry
          </Button>
        </div>
      ) : items.length === 0 && filter.trim() === '' ? (
        <TagEmptyState variant='directory' />
      ) : items.length === 0 ? (
        <TagEmptyState
          variant='filter-no-match'
          query={filter}
          onClearFilter={handleClearFilter}
        />
      ) : (
        <div
          data-testid='tags-directory-page-grid'
          className={GRID_LAYOUT}
          role='list'
          aria-label='Tags'
        >
          {items.map((tag) => (
            <div key={tag.tagId} role='listitem'>
              <TagPill tag={tag} variant='clickable' />
            </div>
          ))}
        </div>
      )}

      {hasMore && !isLoading && !error && items.length > 0 ? (
        <div className='mt-8 flex justify-center'>
          <Button
            variant='outline'
            onClick={loadMore}
            disabled={isLoadingMore}
            data-testid='tags-directory-page-load-more'
          >
            {isLoadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
