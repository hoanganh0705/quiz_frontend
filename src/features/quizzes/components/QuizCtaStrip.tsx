'use client';

/**
 * `<QuizCtaStrip />` — the quiz-detail CTA bar.
 *
 * Source epic: Story 3.6 (quiz detail).
 * Source ticket: TKT-3.6.D2.
 *
 * Renders the Start CTA (placeholder) and the bookmark control in
 * a single horizontal strip. Story 3.10 / TKT-3.10.E2 replaces the
 * Story 3.6 placeholder bookmark button with the feature-aware
 * `<BookmarkButtonSlot variant="detail" />` (Story 3.10 / D4).
 *
 * ## Preserved contracts (E2 AC #1)
 *
 *   - The `<button>` element with `data-testid="quiz-bookmark-button"`
 *     is replaced by the slot's outer wrapper — the slot's INNER
 *     button still carries `data-testid="bookmark-button-{branch}"`
 *     so existing selectors that target the bookmark button test-id
 *     pattern remain compatible. The Start button (with its
 *     `data-testid="quiz-start-attempt-button"`) is untouched.
 *   - The button's accessible semantics (`aria-label`,
 *     `aria-pressed`, `disabled`) remain on the inner D1 button.
 *   - `useIsBookmarked(quizId)` is replaced by the slot's internal
 *     call — the slot reads from the same membership cache (B3) +
 *     SWR revalidation, so consumers do not need to know the
 *     implementation difference.
 *
 * @see BookmarkButtonSlot (Story 3.10 / D4 — feature-aware slot)
 * @see useIsBookmarked (Story 3.10 / B4 — reader preserved by the slot)
 */

import { Play } from 'lucide-react';

import {
  BookmarkButtonSlot,
} from '@/components/primitives/BookmarkButton';
import { Button } from '@/components/ui/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip';
import { cn } from '@/shared/utils/merge-class-names';

const START_TOOLTIP = 'Starting attempts opens in a later release';
const BUTTON_SIZE = 'h-10 w-full min-w-40 sm:w-44';

export interface QuizCtaStripProps {
  quizId: string;
  className?: string;
}

export function QuizCtaStrip({ quizId, className }: QuizCtaStripProps) {
  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-end',
        className,
      )}
      aria-label='Quiz actions'
      data-testid='quiz-cta-strip'
    >
      <BookmarkButtonSlot
        quizId={quizId}
        variant='detail'
        className='contents'
      />

      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className='inline-flex w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto'
            tabIndex={0}
            data-testid='quiz-start-tooltip-trigger'
          >
            <Button
              type='button'
              className={BUTTON_SIZE}
              disabled
              aria-label='Start attempt (unavailable)'
              data-testid='quiz-start-attempt-button'
            >
              <Play aria-hidden='true' />
              Start attempt
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent sideOffset={6}>{START_TOOLTIP}</TooltipContent>
      </Tooltip>
    </section>
  );
}

export { START_TOOLTIP as QUIZ_START_ATTEMPT_TOOLTIP };
