"use client";

import {
  BookmarkButtonSlot,
  type BookmarkButtonSlotProps,
} from "@/components/primitives/BookmarkButton";
import { EntityCard } from "@/components/primitives/EntityCard";
import { initialsFromQuizId } from "@/features/quizzes/utils/quiz-card-decoration";
import type { QuizListItemDto } from "@/lib/api/generated/schemas";

const BADGE =
  "rounded-full border bg-background px-2 py-0.5 text-xs";

function formatDuration(durationMs: number | undefined): string | null {
  if (typeof durationMs !== "number" || durationMs <= 0) return null;
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export interface QuizCardProps {
  quiz: QuizListItemDto;
  className?: string;
  bookmarkSlot?:
    | ((props: BookmarkButtonSlotProps) => React.JSX.Element | null)
    | null;
}

export function QuizCard({
  quiz,
  className,
  bookmarkSlot,
}: QuizCardProps) {
  const href = `/quizzes/${quiz.slug || quiz.quizId}`;
  const difficulty = quiz.publishedVersion?.difficulty;
  const duration = formatDuration(quiz.publishedVersion?.durationMs);

  const renderBookmarkSlot =
    bookmarkSlot === undefined
      ? (props: BookmarkButtonSlotProps) => <BookmarkButtonSlot {...props} />
      : bookmarkSlot;

  return (
    <EntityCard
      href={href}
      title={quiz.title}
      description={quiz.description}
      imageUrl={quiz.imageUrl}
      initials={initialsFromQuizId(quiz.quizId)}
      aspectRatio="16/9"
      coverSize="md"
      className={className}
      linkProps={{
        "data-testid": "quiz-card",
        "data-quiz-id": quiz.quizId,
        "data-quiz-slug": quiz.slug,
      }}
      badges={
        <>
          {quiz.isVerified ? (
            <span className={BADGE}>Verified</span>
          ) : null}
          {quiz.isFeatured ? (
            <span className={BADGE}>Featured</span>
          ) : null}
          {difficulty ? <span className={BADGE}>{difficulty}</span> : null}
        </>
      }
      meta={
        duration ? (
          <span className="tabular-nums">{duration}</span>
        ) : null
      }
      bookmarkSlot={
        renderBookmarkSlot
          ? renderBookmarkSlot({
              quizId: quiz.quizId,
              variant: "card",
            })
          : null
      }
    />
  );
}