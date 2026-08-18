'use client';

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

if (isLoading) {
return (
<QuizRelatedQuizzesSkeleton
className={cn('mt-10', className)}
      />
    );
  }

if (notFound) return null;
if (error !== null) return null;
if (items.length === 0) return null;

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
