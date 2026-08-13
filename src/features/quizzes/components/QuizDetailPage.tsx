'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { useQuizAggregate } from '@/features/quizzes/hooks/useQuizAggregate';
import { CommentsWidget } from '@/features/comments/components/CommentsWidget';
import { ReviewsWidget } from '@/features/reviews/components/ReviewsWidget';

import { QuizByline } from './QuizByline';
import { QuizCtaStrip } from './QuizCtaStrip';
import { QuizDescription } from './QuizDescription';
import { QuizDetailPageSkeleton } from './QuizDetailPageSkeleton';
import { QuizHeader } from './QuizHeader';
import { QuizMetadataRow } from './QuizMetadataRow';
import { QuizQuestionList } from './QuizQuestionList';
import { QuizRelatedQuizzes } from './QuizRelatedQuizzes';
import { QuizStatsPanel } from './QuizStatsPanel';

export interface QuizDetailPageProps {
  idOrSlug: string;
}

export function QuizDetailPage({ idOrSlug }: QuizDetailPageProps) {
  const aggregate = useQuizAggregate(idOrSlug);

  if (aggregate.notFound) {
    notFound();
  }

  if (aggregate.isLoading) {
    return <QuizDetailPageSkeleton />;
  }

  if (aggregate.error || !aggregate.quiz) {
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
            onClick={() => void aggregate.retry()}
            disabled={aggregate.isRetrying}
            data-testid='quiz-detail-retry'
          >
            {aggregate.isRetrying ? 'Retrying…' : 'Retry'}
          </Button>
        </div>
      </div>
    );
  }

  const quiz = aggregate.quiz;
  const stats = aggregate.stats;
  const questions = aggregate.previewQuestions;

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

      <QuizHeader quiz={aggregate.playerQuiz!} />
      <QuizByline author={null} className='mt-6' />
      <QuizMetadataRow
        quiz={aggregate.playerQuiz!}
        stats={stats}
        isStatsLoading={false}
        className='mt-5'
      />
      <QuizDescription description={quiz.description ?? null} className='mt-8' />
      <QuizQuestionList
        questions={aggregate.previewQuestions as unknown as Parameters<typeof QuizQuestionList>[0]['questions']}
        className='mt-10'
      />
      <QuizStatsPanel
        stats={stats}
        isLoading={false}
        noStats={stats === null}
        error={null}
        onRetry={() => void aggregate.retry()}
        isRetrying={aggregate.isRetrying}
        className='mt-10'
      />
      <QuizCtaStrip
        quizId={quiz.quizId}
        quizVersionId={quiz.publishedVersion?.quizVersionId ?? null}
        idOrSlug={idOrSlug}
        authorUserId={quiz.creatorId ?? null}
        authorDisplayName={
          (quiz as unknown as { creator?: { username?: string } }).creator?.username ?? null
        }
        quizTitle={quiz.title}
        alreadySuppressed={false}
        className='mt-6'
      />
      <QuizRelatedQuizzes idOrSlug={idOrSlug} className='mt-10' />
      <ReviewsWidget
        quizId={quiz.quizId}
        className='mt-12'
        startAttemptHref={`/quizzes/${quiz.slug}/attempt`}
      />
      <CommentsWidget quizId={quiz.quizId} />
    </div>
  );
}
