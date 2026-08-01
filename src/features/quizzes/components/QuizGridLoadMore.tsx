/**
 * `<QuizGridLoadMore />` — the load-more affordance for the
 * cursor-paginated quizzes directory.
 *
 * Source epic: Epic 3.5 — Global quizzes list + filters.
 * Source ticket: TKT-3.5.D1.
 *
 * Renders nothing when `hasMore` is `false`. When `hasMore` is
 * `true`, renders a `<Button>` labelled "Load more" that calls
 * `onLoadMore` when clicked. The button is disabled while
 * `isLoading` is `true` (the user shouldn't be able to fire two
 * `loadMore` calls in flight).
 *
 * Accessibility:
 *
 *   - The button is keyboard-activatable (Enter / Space).
 *   - The disabled state is reflected in `aria-disabled`.
 *   - The wrapping `<div>` uses `role="status"` and `aria-live="polite"`
 *     so screen readers announce "Loading more quizzes..." while the
 *     next page is in flight.
 */

import { Button } from '@/components/ui/Button'

export interface QuizGridLoadMoreProps {
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
}

export function QuizGridLoadMore({
  hasMore,
  isLoading,
  onLoadMore
}: QuizGridLoadMoreProps): React.ReactElement | null {
  if (!hasMore) {
    return null
  }

  return (
    <div
      className='mt-6 flex flex-col items-center gap-2'
      role='status'
      aria-live='polite'
      data-testid='quiz-grid-load-more'
    >
      <Button
        variant='outline'
        onClick={onLoadMore}
        disabled={isLoading}
        aria-disabled={isLoading}
        data-testid='quiz-grid-load-more-button'
      >
        {isLoading ? 'Loading more quizzes…' : 'Load more quizzes'}
      </Button>
    </div>
  )
}
