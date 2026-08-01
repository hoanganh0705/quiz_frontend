import { QuizCardSkeleton } from '@/components/primitives/QuizCard/QuizCardSkeleton';
import { cn } from '@/shared/utils/merge-class-names';

const GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3';

export interface QuizRelatedQuizzesSlotProps {
  className?: string;
}

export function QuizRelatedQuizzesSlot({
  className,
}: QuizRelatedQuizzesSlotProps) {
  return (
    <section
      className={cn('flex flex-col gap-4', className)}
      aria-labelledby='quiz-related-heading'
      data-testid='quiz-related-quizzes-slot'
    >
      <h2 id='quiz-related-heading' className='text-xl font-semibold text-foreground sm:text-2xl'>
        Related quizzes
      </h2>
      <div
        className={GRID}
        data-testid='quiz-related-quizzes-grid'
        aria-label='Related quizzes loading'
        aria-busy='true'
      >
        {Array.from({ length: 3 }, (_, index) => (
          <QuizCardSkeleton key={index} data-related-slot-card={index + 1} />
        ))}
      </div>
    </section>
  );
}
