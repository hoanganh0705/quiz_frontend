/**
 * `<QuizRelatedQuizzesSkeleton />` — the loading-only counterpart of
 * `<QuizRelatedQuizzes />`.
 *
 * Source epic: Story 3.8 — Related quizzes block.
 * Source ticket: TKT-3.8.B3.
 *
 * CLS-zero invariant (Story 3.8 AC #3): the skeleton's outer
 * dimensions MUST match the resolved grid's outer dimensions at
 * every breakpoint so swapping the skeleton for the resolved block
 * on first paint produces zero CLS.
 *
 * To enforce parity with the resolved component, this skeleton's
 * `<section>` wrapper, heading, grid classes, and four-card count
 * are intentionally identical to the resolved component's structure
 * (TKT-3.8.B2 AC #2 + AC #5):
 *
 *   - Wrapper: `<section className="flex flex-col gap-4 …" aria-labelledby="quiz-related-heading">`
 *   - Heading: `<h2 id="quiz-related-heading">Related quizzes</h2>` with the
 *     same Tailwind classes the resolved component uses.
 *   - Grid: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4`
 *     (4 columns on `lg` to match the resolved grid).
 *   - Cards: four `<QuizCardSkeleton />`s in the same row order.
 *
 * The skeleton respects `prefers-reduced-motion` via the shadcn
 * `<Skeleton />` primitive's CSS — that primitive already gates its
 * `animate-pulse` on the user's motion preference. Story 3.8 does
 * not introduce a new animation gate.
 */

import { QuizCardSkeleton } from '@/components/primitives/QuizCard/QuizCardSkeleton';
import { cn } from '@/shared/utils/merge-class-names';

import { QUIZ_RELATED_LIMIT } from '@/features/quizzes/hooks/useQuizRelated';

export interface QuizRelatedQuizzesSkeletonProps {
  className?: string;
}

export function QuizRelatedQuizzesSkeleton({
  className,
}: QuizRelatedQuizzesSkeletonProps): React.ReactElement {
  // Stable heading `id` matches the resolved component (`B2`) so
  // the `aria-labelledby` target continues to resolve when the
  // skeleton swaps to the resolved block on first paint.
  return (
    <section
      className={cn('flex flex-col gap-4', className)}
      aria-labelledby='quiz-related-heading'
      data-testid='quiz-related-quizzes-skeleton'
    >
      <h2
        id='quiz-related-heading'
        className='text-xl font-semibold text-foreground sm:text-2xl'
      >
        Related quizzes
      </h2>
      <div
        className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'
        data-testid='quiz-related-quizzes-skeleton-grid'
        aria-label='Related quizzes loading'
        aria-busy='true'
      >
        {Array.from({ length: QUIZ_RELATED_LIMIT }, (_, index) => (
          <QuizCardSkeleton
            key={index}
            data-related-slot-card={index + 1}
          />
        ))}
      </div>
    </section>
  );
}
