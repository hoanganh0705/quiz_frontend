'use client'

/**
 * `<TagQuizGrid>` — cursor-paginated grid of `<QuizCard />` for the
 * tag detail page.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.D1.
 *
 * Consumes `useTagQuizzes(slug, params)` from B4. Wires the hook's
 * contract into the four documented UI states:
 *
 * | State                                                | Render                                                                |
 * | ---------------------------------------------------- | --------------------------------------------------------------------- |
 * | `isLoading` (first page)                             | 12 `<QuizCardSkeleton />` (no CLS once items arrive).                 |
 * | resolved + `hasMore`                                 | Grid of `<QuizCard />` + a "Load more" button.                        |
 * | resolved + no `hasMore`                              | Grid of `<QuizCard />`, no Load-more button.                          |
 * | `items.length === 0` and not loading and not error   | `<TagEmptyState variant="quizzes-by-tag" />`.                         |
 * | `error`                                              | Inline error message with a retry button (`refresh()`).              |
 * | 429 retry banner                                     | Inline banner above the grid (per Epic 3.2 D5).                       |
 *
 * ## 404 contract (Epic 3.4 B4 docstring)
 *
 * The hook catches `ApiError(404)` from the sub-endpoint and returns
 * `{ items: [], error: null }`. This grid therefore renders the
 * empty state — NOT the page-level `NotFound` — for sub-resource
 * 404s. The header-level 404 is handled by `TagDetailPage` (D3)
 * via `useTagBySlug(slug)`.
 *
 * ## Client component
 *
 * The grid consumes the SWR-backed hook, so it ships `'use client'`.
 * The grid is a leaf component in the page tree — the parent page
 * (D3) decides whether to render the grid at all (e.g. it does not
 * render the grid when the header is in a 404 state).
 */

import { QuizCardGrid } from '@/components/primitives'
import { Button } from '@/components/ui/Button'
import { TagEmptyState } from './TagEmptyState'
import { useTagQuizzes } from '@/features/tags/hooks/useTagQuizzes'

export interface TagQuizGridProps {
  slug: string
  params?: { limit?: number }
  /** Number of skeleton cards to render during first-load. Defaults to 12. */
  skeletonCount?: number
}

/**
 * Structural shape of the items the hook produces. The hook
 * synthesises an `id` alias on each item (see `useTagQuizzes` B4
 * docstring) so the cursor primitive's `appendUniqueById` helper
 * can dedupe across pages — but the components rendered here
 * consume the wire-shape field `quizId`, never the alias.
 */
type WireQuizItem = NonNullable<
  ReturnType<typeof useTagQuizzes>['items'][number]
>

export function TagQuizGrid({
  slug,
  params,
  skeletonCount = 12,
}: TagQuizGridProps): React.ReactElement {
  const {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    error,
    refresh,
    retryBannerVisible,
  } = useTagQuizzes(slug, params ?? {})

  if (isLoading) {
    return (
      <div data-testid='tag-quiz-grid-loading'>
        <QuizCardGrid skeletonCount={skeletonCount} />
      </div>
    )
  }

  if (error) {
    return (
      <div
        className='text-center py-12'
        role='alert'
        data-testid='tag-quiz-grid-error'
      >
        <p className='text-destructive text-lg mb-4'>
          {error.status && error.status >= 500
            ? 'Something went wrong on our end. Please try again.'
            : 'Could not load quizzes for this tag.'}
        </p>
        <Button
          variant='outline'
          onClick={() => void refresh()}
          data-testid='tag-quiz-grid-retry'
        >
          Retry
        </Button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div data-testid='tag-quiz-grid-empty'>
        <TagEmptyState variant='quizzes-by-tag' />
      </div>
    )
  }

  return (
    <div data-testid='tag-quiz-grid'>
      {retryBannerVisible ? (
        <div
          className='mb-4 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive'
          role='status'
          data-testid='tag-quiz-grid-retry-banner'
        >
          The server is having trouble. We&apos;ve retried several times — please
          refresh the page in a moment.
        </div>
      ) : null}

      <QuizCardGrid
        items={items as readonly WireQuizItem[]}
        toQuiz={(item: WireQuizItem) => item}
      />

      {hasMore ? (
        <div className='mt-8 flex justify-center'>
          <Button
            variant='outline'
            onClick={loadMore}
            disabled={isLoadingMore}
            data-testid='tag-quiz-grid-load-more'
          >
            {isLoadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
