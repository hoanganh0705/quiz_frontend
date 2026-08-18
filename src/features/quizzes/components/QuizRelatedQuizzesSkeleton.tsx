

import { QuizCardSkeleton } from '@/components/primitives/QuizCard/QuizCardSkeleton';
import { cn } from '@/shared/utils/merge-class-names';

import { QUIZ_RELATED_LIMIT } from '@/features/quizzes/hooks/useQuizRelated';

export interface QuizRelatedQuizzesSkeletonProps {
className?: string;
}

export function QuizRelatedQuizzesSkeleton({
className,
}: QuizRelatedQuizzesSkeletonProps): React.ReactElement {

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
