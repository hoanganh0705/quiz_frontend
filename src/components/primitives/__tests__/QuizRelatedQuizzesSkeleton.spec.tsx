/**
 * `QuizRelatedQuizzesSkeleton.spec.tsx` — locks the skeleton's
 * CLS-zero outer-dimension invariant for the related-quizzes
 * loading state.
 *
 * Source epic: Story 3.8 — Related quizzes block.
 * Source ticket: TKT-3.8.B3.
 *
 * Two cases per the ticket's B4 AC #3:
 *
 *   (a) renders FOUR `<QuizCardSkeleton />`s in a
 *       `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` grid (matching
 *       the resolved component's grid classes one-for-one).
 *   (b) heading parity — the snapshot includes the heading
 *       `Related quizzes` with `id="quiz-related-heading"`.
 *
 * Test-environment note: vitest's jsdom project picks up files
 * only under the primitives test dir (per `vitest.config.ts`).
 * This spec therefore lives under that directory so the jsdom
 * environment — required for `@testing-library/react` — is
 * applied. The component under test is in
 * `src/features/quizzes/components/QuizRelatedQuizzesSkeleton.tsx`
 * (TKT-3.8.B3).
 */

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'

import { QuizRelatedQuizzesSkeleton } from '@/features/quizzes/components/QuizRelatedQuizzesSkeleton'

afterEach(() => {
  cleanup()
})

describe('QuizRelatedQuizzesSkeleton', () => {
  it('renders 4 card skeletons in a 4-column grid (CLS-zero lock)', () => {
    render(<QuizRelatedQuizzesSkeleton />)

    // Heading parity — the resolved component (B2) renders the
    // exact same heading + id so the `aria-labelledby` target
    // continues to resolve when the skeleton swaps to the resolved
    // block on first paint (AC #3).
    expect(
      screen.getByRole('heading', { level: 2, name: 'Related quizzes' }),
    ).toHaveAttribute('id', 'quiz-related-heading')

    const grid = screen.getByTestId('quiz-related-quizzes-skeleton-grid')
    expect(grid.className).toMatch(/grid-cols-1/)
    expect(grid.className).toMatch(/sm:grid-cols-2/)
    expect(grid.className).toMatch(/lg:grid-cols-4/)
    expect(grid.className).toMatch(/gap-4/)

    // Four card skeletons — the Story 3.8 line 878 baseline
    // "Skeleton grid × 4".
    expect(within(grid).getAllByTestId('quiz-card-skeleton')).toHaveLength(
      4,
    )
  })

  it('does not fabricate links or quiz IDs in the loading state', () => {
    const { container } = render(<QuizRelatedQuizzesSkeleton />)

    // No anchors (no QuizCard yet) — the user cannot click through
    // from a loading state.
    expect(container.querySelector('a')).toBeNull()
    expect(container.querySelector('[data-quiz-id]')).toBeNull()
  })
})
