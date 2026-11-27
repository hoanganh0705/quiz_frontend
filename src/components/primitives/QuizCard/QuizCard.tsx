"use client";

import {
  BookmarkButtonSlot,
  type BookmarkButtonSlotProps,
} from "@/components/primitives/BookmarkButton";
import { EntityCard } from "@/components/primitives/EntityCard";

import { DifficultyBadge } from "@/shared/ui/DifficultyBadge";
import { initialsFromId } from "@/shared/utils/entity-decoration";
import { formatDurationMs } from "@/shared/utils/format-duration";

import type { QuizListItemDto } from "@/lib/api/generated/schemas";

const BADGE = "rounded-full border bg-background px-2 py-0.5 text-xs";

export interface QuizCardProps {
  quiz: QuizListItemDto;
  className?: string;
  bookmarkSlot?:
    ((props: BookmarkButtonSlotProps) => React.JSX.Element | null) | null;
}

export function QuizCard({ quiz, className, bookmarkSlot }: QuizCardProps) {
  const href = `/quizzes/${quiz.slug || quiz.quizId}`;
  const difficulty = quiz.publishedVersion?.difficulty;
  const durationMs = quiz.publishedVersion?.durationMs;
  const duration =
    typeof durationMs === "number" && durationMs > 0
      ? formatDurationMs(durationMs)
      : null;

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
      initials={initialsFromId(quiz.quizId)}
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
          {quiz.isVerified ? <span className={BADGE}>Verified</span> : null}
          {quiz.isFeatured ? <span className={BADGE}>Featured</span> : null}
          {difficulty ? <DifficultyBadge difficulty={difficulty} /> : null}
        </>
      }
      meta={duration ? <span className="tabular-nums">{duration}</span> : null}
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
