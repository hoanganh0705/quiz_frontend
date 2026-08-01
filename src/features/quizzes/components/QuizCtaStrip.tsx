'use client';

import { Bookmark, Play } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip';
import { useIsBookmarked } from '@/features/quizzes/hooks/useIsBookmarked';
import { cn } from '@/shared/utils/merge-class-names';

const START_TOOLTIP = 'Starting attempts opens in a later release';
const BUTTON_SIZE = 'h-10 w-full min-w-40 sm:w-44';

export interface QuizCtaStripProps {
  quizId: string;
  className?: string;
}

export function QuizCtaStrip({ quizId, className }: QuizCtaStripProps) {
  const { isBookmarked, isLoading } = useIsBookmarked(quizId);

  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-end',
        className,
      )}
      aria-label='Quiz actions'
      data-testid='quiz-cta-strip'
    >
      <Button
        type='button'
        variant='outline'
        className={BUTTON_SIZE}
        disabled={isLoading}
        aria-label={isBookmarked ? 'Bookmarked quiz' : 'Bookmark quiz'}
        aria-pressed={isBookmarked}
        data-testid='quiz-bookmark-button'
        data-bookmarked={isBookmarked ? 'true' : 'false'}
      >
        <Bookmark
          aria-hidden='true'
          className={isBookmarked ? 'fill-current' : undefined}
        />
        {isLoading ? 'Loading…' : isBookmarked ? 'Bookmarked' : 'Bookmark'}
      </Button>

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
