'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { useQuizByIdOrSlug } from '@/features/quizzes/hooks/useQuizByIdOrSlug';
import { useQuizStatsByIdOrSlug } from '@/features/quizzes/hooks/useQuizStatsByIdOrSlug';

import { QuizByline } from './QuizByline';
import { QuizCtaStrip } from './QuizCtaStrip';
import { QuizDescription } from './QuizDescription';
import { QuizDetailPageSkeleton } from './QuizDetailPageSkeleton';
import { QuizHeader } from './QuizHeader';
import { QuizMetadataRow } from './QuizMetadataRow';
import { QuizQuestionList } from './QuizQuestionList';
import { QuizRelatedQuizzesSlot } from './QuizRelatedQuizzesSlot';
import { QuizStatsPanel } from './QuizStatsPanel';

export interface QuizDetailPageProps {
  idOrSlug: string;
}

export function QuizDetailPage({ idOrSlug }: QuizDetailPageProps) {
  const detail = useQuizByIdOrSlug(idOrSlug);
  const stats = useQuizStatsByIdOrSlug(idOrSlug);

  if (detail.notFound) {
    notFound();
  }

  if (detail.isLoading) {
    return <QuizDetailPageSkeleton />;
  }

  if (detail.error || !detail.quiz) {
    return (
      <div
        className='mx-auto min-h-[60vh] w-full max-w-6xl overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-8'
        data-testid='quiz-detail-page-error'
      >
        <div
          className='rounded-xl border border-destructive/40 bg-card p-4 shadow-lg sm:p-5'
          role='alert'
        >
          <p className='font-semibold text-foreground'>We couldn&apos;t load this quiz</p>
          <p className='mt-1 text-sm text-muted-foreground'>Please try again. Your other pages are unaffected.</p>
          <Button
            type='button'
            variant='outline'
            className='mt-4 min-w-24'
            onClick={() => void detail.retry()}
            disabled={detail.isRetrying}
            data-testid='quiz-detail-retry'
          >
            {detail.isRetrying ? 'Retrying…' : 'Retry'}
          </Button>
        </div>
      </div>
    );
  }

  const quiz = detail.quiz;
  const questions = quiz.publishedVersion?.questions ?? [];

  return (
    <div
      className='mx-auto min-h-screen w-full max-w-6xl overflow-x-hidden px-4 py-6 text-foreground sm:px-6 sm:py-8 lg:px-8'
      data-testid='quiz-detail-page'
      data-quiz-id={quiz.quizId}
    >
      <nav aria-label='Breadcrumb' className='mb-6 text-sm text-muted-foreground'>
        <ol className='flex min-w-0 flex-wrap items-center gap-1'>
          <li>
            <Link href='/' className='rounded-sm hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
              Home
            </Link>
          </li>
          <li aria-hidden='true'>/</li>
          <li>
            <Link href='/quizzes' className='rounded-sm hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
              Quizzes
            </Link>
          </li>
          <li aria-hidden='true'>/</li>
          <li className='min-w-0 truncate text-foreground' aria-current='page'>
            {quiz.title}
          </li>
        </ol>
      </nav>

      <QuizHeader quiz={quiz} />
      <QuizByline author={null} className='mt-6' />
      <QuizMetadataRow
        quiz={quiz}
        stats={stats.stats}
        isStatsLoading={stats.isLoading}
        className='mt-5'
      />
      <QuizDescription description={quiz.description} className='mt-8' />
      <QuizQuestionList questions={questions} className='mt-10' />
      <QuizStatsPanel
        stats={stats.stats}
        isLoading={stats.isLoading}
        noStats={stats.noStats}
        error={stats.error}
        onRetry={stats.retry}
        isRetrying={stats.isRetrying}
        className='mt-10'
      />
      <QuizCtaStrip quizId={quiz.quizId} className='mt-6' />
      <QuizRelatedQuizzesSlot className='mt-10' />
    </div>
  );
}
