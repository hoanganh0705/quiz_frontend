'use client';

/**
 * `<QuizRelatedQuizzes />` — live replacement for the legacy
 * `<QuizRelatedQuizzesSlot />` placeholder on `/quizzes/[idOrSlug]`.
 *
 * Source epic: Story 3.8 — Related quizzes block.
 * Source ticket: TKT-3.8.B2.
 *
 * The component reaches `useQuizRelated(idOrSlug)` (TKT-3.8.B1) and
 * renders a 4-card grid of `<QuizCard />`s. The block is HIDDEN
 * entirely (returns `null`) when:
 *
 *   - The hook reports `notFound: true` (the quiz is soft-deleted
 *     or the slug/UUID is unknown — controller 404 contract from
 *     `quiz_backend/.../quiz.controller.ts:405-408`).
 *   - The hook reports `items.length === 0` (the related engine has
 *     not yet computed enough items — Story 3.8 line 880
 *     "Hidden — if related quizzes is empty, the block is not
 *     rendered at all (not an 'empty state' the user perceives as
 *     failure)").
 *   - The hook reports a non-`ApiError`-mappable failure
 *     (5xx / 422 / 429-after-retries — Story 3.8 lines 884–885:
 *     "Error → render nothing" / "5xx/timeout → swallowed
 *     silently").
 *
 * Loading renders `<QuizRelatedQuizzesSkeleton />` (TKT-3.8.B3) —
 * the skeleton and the resolved block share the same wrapper
 * `<section>` + heading + 4-column grid classes, locking the
 * CLS-zero invariant (Story 3.8 AC #3). The skeleton test is the
 * lock (B4).
 *
 * The component does NOT log to Sentry / captureException for any
 * failure — silent failure is the contract (Story 3.8 lines 884–885:
 * "does not blank the detail page" / "swallowed silently").
 *
 * The component does NOT render an "empty state" UI; the absence
 * of the block IS the empty state (Story 3.8 line 880).
 */

import { QuizCard } from '@/components/primitives/QuizCard/QuizCard';
import { cn } from '@/shared/utils/merge-class-names';

import {
  QUIZ_RELATED_LIMIT,
  useQuizRelated,
} from '@/features/quizzes/hooks/useQuizRelated';

import { QuizRelatedQuizzesSkeleton } from './QuizRelatedQuizzesSkeleton';

export interface QuizRelatedQuizzesProps {
  idOrSlug: string;
  className?: string;
}

export function QuizRelatedQuizzes({
  idOrSlug,
  className,
}: QuizRelatedQuizzesProps): React.ReactElement | null {
  const { items, isLoading, error, notFound } = useQuizRelated(idOrSlug);

  // AC #3: Loading — render the skeleton so the first paint reserves
  // the same outer dimensions as the resolved grid (CLS = 0). The
  // skeleton's heading `id` matches the resolved component's
  // heading `id`, so screen-reader / Playwright selectors continue
  // to work across the swap.
  if (isLoading) {
    return (
      <QuizRelatedQuizzesSkeleton
        className={cn('mt-10', className)}
      />
    );
  }

  // AC #2: hide the block entirely on empty / 404 / 5xx.
  // Story 3.8 line 880: "the block is not rendered at all".
  // No toast, no inline error surface (Story 3.8 lines 884–885).
  if (notFound) return null;
  if (error !== null) return null;
  if (items.length === 0) return null;

  // AC #1: render the heading + 4-card grid in the order the
  // backend returned (relevance-ranked per the controller's
  // description at `quiz.controller.ts:397-401`).
  return (
    <section
      className={cn('flex flex-col gap-4', className)}
      aria-labelledby='quiz-related-heading'
      data-testid='quiz-related-quizzes'
    >
      <h2
        id='quiz-related-heading'
        className='text-xl font-semibold text-foreground sm:text-2xl'
      >
        Related quizzes
      </h2>
      <div
        className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'
        data-testid='quiz-related-quizzes-grid'
      >
        {items.slice(0, QUIZ_RELATED_LIMIT).map((quiz) => (
          <QuizCard key={quiz.quizId} quiz={quiz} />
        ))}
      </div>
    </section>
  );
}
