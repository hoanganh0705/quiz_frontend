"use client";

import { notFound } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { useQuizAggregate } from "@/features/quizzes/hooks/useQuizAggregate";
import { CommentsWidget } from "@/features/comments/components/CommentsWidget";
import { ReviewsWidget } from "@/features/reviews/components/ReviewsWidget";

import { QuizByline, type PublicAuthorSummary } from "./QuizByline";
import { QuizCtaStrip } from "./QuizCtaStrip";
import { QuizDescription } from "./QuizDescription";
import { QuizDetailPageSkeleton } from "./QuizDetailPageSkeleton";
import { QuizHeader } from "./QuizHeader";
import { QuizMetadataRow } from "./QuizMetadataRow";
import { QuizRelatedQuizzes } from "./QuizRelatedQuizzes";
import { QuizStatsPanel } from "./QuizStatsPanel";

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
        className="mx-auto min-h-[60vh] w-full max-w-6xl overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
        data-testid="quiz-detail-page-error"
      >
        <div
          className="rounded-xl border border-destructive/40 bg-card p-4 shadow-lg sm:p-5"
          role="alert"
        >
          <p className="font-semibold text-foreground">
            We couldn&apos;t load this quiz
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Please try again. Your other pages are unaffected.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 min-w-24"
            onClick={() => void aggregate.retry()}
            disabled={aggregate.isRetrying}
            data-testid="quiz-detail-retry"
          >
            {aggregate.isRetrying ? "Retrying…" : "Retry"}
          </Button>
        </div>
      </div>
    );
  }

  const quiz = aggregate.quiz;
  const stats = aggregate.stats;

  const authorSummary: PublicAuthorSummary | null = quiz.creator
    ? {
        userId: quiz.creator.userId,
        handle:
          quiz.creator.displayName?.trim() ||
          quiz.creator.username ||
          "Creator",
        avatarUrl: quiz.creator.avatarUrl ?? null,
      }
    : null;

  return (
    <div
      className="mx-auto min-h-screen w-full max-w-6xl overflow-x-hidden px-4 py-6 text-foreground sm:px-6 sm:py-8 lg:px-8"
      data-testid="quiz-detail-page"
      data-quiz-id={quiz.quizId}
    >
      <QuizHeader quiz={aggregate.playerQuiz!}>
        <div className="flex flex-col gap-3 pt-2">
          <QuizByline author={authorSummary} />
          <QuizMetadataRow
            quiz={aggregate.playerQuiz!}
            stats={stats}
            isStatsLoading={false}
          />
        </div>
      </QuizHeader>

      <QuizCtaStrip
        quizId={quiz.quizId}
        quizVersionId={quiz.publishedVersion?.quizVersionId ?? null}
        idOrSlug={idOrSlug}
        authorUserId={quiz.creatorId ?? quiz.creator?.userId ?? null}
        authorDisplayName={
          quiz.creator?.displayName?.trim() ||
          quiz.creator?.username ||
          null
        }
        quizTitle={quiz.title}
        alreadySuppressed={false}
        className="mt-6"
      />

      <QuizDescription
        description={quiz.description ?? null}
        className="mt-6"
      />

      <QuizStatsPanel
        stats={stats}
        isLoading={false}
        noStats={stats === null}
        error={null}
        onRetry={() => void aggregate.retry()}
        isRetrying={aggregate.isRetrying}
        className="mt-10"
      />

      <QuizRelatedQuizzes idOrSlug={idOrSlug} className="mt-12" />

      <ReviewsWidget
        quizId={quiz.quizId}
        className="mt-12"
        startAttemptHref={`/quizzes/${quiz.slug}/attempt`}
      />

      <CommentsWidget quizId={quiz.quizId} />
    </div>
  );
}
