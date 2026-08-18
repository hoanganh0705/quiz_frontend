import { QuizCardSkeleton } from '@/components/primitives/QuizCard/QuizCardSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';

import { QuizStatsPanelSkeleton } from './QuizStatsPanel';

function QuestionCardSkeleton({ index }: { index: number }) {
return (
<article
className='flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:p-6'
aria-label={`Loading question ${index}`}
data-testid='quiz-detail-question-skeleton'
    >
<Skeleton className='h-6 w-6 rounded-full' />
<Skeleton className='h-5 w-4/5' />
<div className='flex flex-col gap-2'>
{Array.from({ length: 4 }, (_, optionIndex) => (
<Skeleton key={optionIndex} className='h-12 w-full' />
        ))}
</div>
</article>
  );
}

export function QuizDetailPageSkeleton() {
return (
<div
className='mx-auto min-h-screen w-full max-w-6xl overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-8'
aria-label='Loading quiz details'
aria-busy='true'
data-testid='quiz-detail-page-skeleton'
    >
<Skeleton className='mb-6 h-4 w-44' />

<div className='flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8' data-testid='quiz-detail-header-skeleton'>
<Skeleton className='aspect-4/3 w-full shrink-0 rounded-xl sm:w-72 md:w-80' data-testid='quiz-detail-cover-skeleton' />
<div className='flex min-w-0 flex-1 flex-col gap-3'>
<Skeleton className='h-9 w-4/5' data-testid='quiz-detail-title-skeleton' />
<Skeleton className='h-6 w-24 rounded-full' />
<div className='flex flex-wrap gap-2'>
<Skeleton className='h-5 w-16 rounded-full' />
<Skeleton className='h-5 w-20 rounded-full' />
</div>
</div>
</div>

<div className='mt-6 flex items-center gap-3' data-testid='quiz-detail-byline-skeleton'>
<Skeleton className='h-9 w-9 rounded-full' />
<Skeleton className='h-4 w-28' />
</div>

<div className='mt-5 flex flex-wrap gap-x-6 gap-y-3' data-testid='quiz-detail-metadata-skeleton'>
{Array.from({ length: 5 }, (_, index) => (
<Skeleton key={index} className='h-4 w-20' />
        ))}
</div>

<section className='mt-8 flex flex-col gap-3' data-testid='quiz-detail-description-skeleton'>
<Skeleton className='h-4 w-full' />
<Skeleton className='h-4 w-full' />
<Skeleton className='h-4 w-3/4' />
</section>

<section className='mt-10 flex flex-col gap-4' data-testid='quiz-detail-questions-skeleton'>
<Skeleton className='h-8 w-36' />
{Array.from({ length: 5 }, (_, index) => (
<QuestionCardSkeleton key={index} index={index + 1} />
        ))}
</section>

<QuizStatsPanelSkeleton className='mt-10' />

<section
className='mt-6 flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:justify-end'
aria-label='Loading quiz actions'
data-testid='quiz-detail-cta-skeleton'
      >
<Skeleton className='h-10 w-full sm:w-44' data-testid='quiz-detail-cta-button-skeleton' />
<Skeleton className='h-10 w-full sm:w-44' data-testid='quiz-detail-cta-button-skeleton' />
</section>

<section className='mt-10 flex flex-col gap-4' aria-label='Loading related quizzes' data-testid='quiz-detail-related-skeleton'>
<Skeleton className='h-8 w-44' />
<div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
{Array.from({ length: 4 }, (_, index) => (
<QuizCardSkeleton key={index} />
          ))}
</div>
</section>
</div>
  );
}
