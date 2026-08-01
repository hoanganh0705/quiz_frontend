/**
 * `<QuizGridEmpty />` — the filter-aware empty state for the quizzes
 * directory.
 *
 * Source epic: Epic 3.5 — Global quizzes list + filters.
 * Source ticket: TKT-3.5.D1.
 *
 * Two variants (Story 3.5 lines 563–564):
 *
 *   - **`filters-no-match`** — the user has active filters but the
 *     filtered list is empty. The empty state renders `"No quizzes
 *     match these filters. Try removing some filters."` plus a
 *     "Reset filters" CTA that calls `useQuizFiltersStore.setState({}, true)`.
 *   - **`directory-empty`** — the user has no active filters AND the
 *     directory is empty. The empty state renders `"No published
 *     quizzes yet."`.
 *
 * The copy is intentionally written verbatim per the ticket
 * instructions — the strings are stable contracts and must not be
 * localised without a parallel ticket.
 */

import { FolderOpen, SearchX } from 'lucide-react'

import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'

export type QuizGridEmptyVariant = 'filters-no-match' | 'directory-empty'

export interface QuizGridEmptyProps {
  /**
   * When `true`, the empty state is the "filters no match" variant.
   * When `false`, it's the "directory empty" variant. Caller computes
   * the boolean from the filter state (D1 owns the policy).
   */
  hasFilters: boolean
  /** Resets the filter store when invoked. */
  onReset: () => void
}

export function QuizGridEmpty({
  hasFilters,
  onReset
}: QuizGridEmptyProps): React.ReactElement {
  const variant: QuizGridEmptyVariant = hasFilters
    ? 'filters-no-match'
    : 'directory-empty'

  if (variant === 'filters-no-match') {
    return (
      <div
        data-testid='quiz-grid-empty'
        data-variant='filters-no-match'
      >
        <EmptyState
          icon={SearchX}
          title='No quizzes match these filters.'
          description='Try removing some filters.'
          actions={[
            {
              label: 'Reset filters',
              onClick: onReset,
              variant: 'outline'
            }
          ]}
        />
      </div>
    )
  }

  return (
    <div data-testid='quiz-grid-empty' data-variant='directory-empty'>
      <EmptyState
        icon={FolderOpen}
        title='No published quizzes yet.'
        description='Check back soon for new content.'
      />
    </div>
  )
}

/**
 * Convenience wrapper used by callers that want the raw `Button` +
 * label, not the EmptyState layout. Used by tests.
 */
export function QuizGridEmptyResetButton({
  onReset
}: {
  onReset: () => void
}) {
  return (
    <Button onClick={onReset} variant='outline'>
      Reset filters
    </Button>
  )
}
