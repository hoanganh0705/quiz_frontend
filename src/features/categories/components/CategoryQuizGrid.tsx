'use client'

/**
 * `<CategoryQuizGrid />` — cursor-paginated grid of `<QuizCard />`
 * for the category detail page.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source ticket: TKT-3.3.D1.
 *
 * Consumes `useCategoryQuizzes(idOrSlug, params)` from B4. Wires the
 * hook's contract into the four documented UI states:
 *
 * | State                    | Render                                                      |
 * | ------------------------ | ----------------------------------------------------------- |
 * | `isLoading` (first page) | 12 `<QuizCardSkeleton />` (no CLS once items arrive).       |
 * | resolved + `hasMore`     | Grid of `<QuizCard />` + a "Load more" button.              |
 * | resolved + no `hasMore`  | Grid of `<QuizCard />`, no Load-more button.                |
 * | `items.length === 0` and not loading and not error | `<CategoryEmptyState variant="quizzes-in-category" />`. |
 * | `error`                  | Inline error message with a retry button (`refresh()`).    |
 * | 429 retry banner         | Inline banner above the grid (per Story 3.3 line 342).      |
 *
 * ## 404 contract (Epic 3.3 B4 docstring)
 *
 * The hook (`useCategoryQuizzes`) catches `ApiError(404)` from the
 * sub-endpoint and returns `{ items: [], error: null }`. This grid
 * therefore renders the empty state — NOT the `NotFound` component —
 * for sub-resource 404s. The header-level 404 is handled by the
 * `CategoryDetailPage` (D3) via `useCategory(idOrSlug)`.
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
import { CategoryEmptyState } from './CategoryEmptyState'
import { useCategoryQuizzes } from '@/features/categories/hooks'
import type { QuizListItemDto } from '@/lib/api/generated/schemas'

export interface CategoryQuizGridProps {
  idOrSlug: string
  params?: { limit?: number }
  /** Number of skeleton cards to render during first-load. Defaults to 12. */
  skeletonCount?: number
}

export function CategoryQuizGrid({
  idOrSlug,
  params,
  skeletonCount = 12,
}: CategoryQuizGridProps): React.ReactElement {
  const {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    error,
    refresh,
    retryBannerVisible,
  } = useCategoryQuizzes(idOrSlug, params ?? {})

  // Loading state — first page, no items yet. The skeleton count is
  // 12 (3 rows × 4 columns clipped to 12) — matches the Story 3.3
  // line 329 acceptance criterion.
  if (isLoading) {
    return (
      <div data-testid='category-quiz-grid-loading'>
        <QuizCardGrid skeletonCount={skeletonCount} />
      </div>
    )
  }

  // Error state — generic message + retry button. The retry button
  // calls `refresh()` from the hook, which re-fetches the first page.
  if (error) {
    return (
      <div
        className='text-center py-12'
        role='alert'
        data-testid='category-quiz-grid-error'
      >
        <p className='text-destructive text-lg mb-4'>
          {error.status && error.status >= 500
            ? 'Something went wrong on our end. Please try again.'
            : 'Could not load quizzes for this category.'}
        </p>
        <Button
          variant='outline'
          onClick={() => void refresh()}
          data-testid='category-quiz-grid-retry'
        >
          Retry
        </Button>
      </div>
    )
  }

  // Empty state — no items, no error, no loading. Render the
  // empty-state component (the 404-→-empty contract from B4 lands here).
  if (items.length === 0) {
    return (
      <div data-testid='category-quiz-grid-empty'>
        <CategoryEmptyState variant='quizzes-in-category' />
      </div>
    )
  }

  // Resolved state — grid + optional retry banner + load-more button.
  return (
    <div data-testid='category-quiz-grid'>
      {retryBannerVisible ? (
        <div
          className='mb-4 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive'
          role='status'
          data-testid='category-quiz-grid-retry-banner'
        >
          The server is having trouble. We&apos;ve retried several times — please
          refresh the page in a moment.
        </div>
      ) : null}

      <QuizCardGrid
        items={items as readonly QuizListItemDto[]}
        toQuiz={(item: QuizListItemDto) => item}
      />

      {hasMore ? (
        <div className='mt-8 flex justify-center'>
          <Button
            variant='outline'
            onClick={loadMore}
            disabled={isLoadingMore}
            data-testid='category-quiz-grid-load-more'
          >
            {isLoadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
