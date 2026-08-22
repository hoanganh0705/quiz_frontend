"use client";

import { EntityCard, type EntityCardProps } from "@/components/primitives/EntityCard/EntityCard";

import { initialsFromQuizId } from "@/features/quizzes/utils/quiz-card-decoration";

/**
 * The minimal wire shape every rail-quiz-card variant accepts. Each rail's
 * DTO maps onto this shape so the card never has to fabricate fields that
 * the wire does not ship (description, ratings, tags, etc.).
 */
export interface RailQuiz {
  quizId: string;
  title: string;
  slug: string;
  imageUrl?: string | null;
}

export interface RailQuizCardProps {
  quiz: RailQuiz;
  /** Optional rail badge (e.g. "Trending", "Popular") rendered above the meta row. */
  badge?: string;
  /** Optional metric rendered in the meta row, right-aligned (e.g. "1.2k attempts"). */
  metric?: string;
  /** Heading level. Default `h3`. */
  titleHeadingLevel?: EntityCardProps["titleHeadingLevel"];
  /** Extra className on the outer link. */
  className?: string;
}

/**
 * Rail-specific quiz card. Reads only the fields the wire carries and never
 * fabricates data the upstream DTO does not ship. For richer cards (Featured
 * rail uses `QuizCard` which reads `QuizListItemDto`), keep using the
 * quiz-specific primitive.
 */
export function RailQuizCard({
  quiz,
  badge,
  metric,
  titleHeadingLevel = 3,
  className,
}: RailQuizCardProps) {
  const href = `/quizzes/${quiz.slug || quiz.quizId}`;

  return (
    <EntityCard
      href={href}
      title={quiz.title}
      description={null}
      imageUrl={quiz.imageUrl ?? null}
      imageAlt=""
      initials={initialsFromQuizId(quiz.quizId)}
      aspectRatio="16/9"
      coverSize="md"
      className={className}
      linkProps={{
        "data-testid": "rail-quiz-card",
        "data-quiz-id": quiz.quizId,
        "data-quiz-slug": quiz.slug,
      }}
      badges={badge ? <span className="rounded-full border bg-background px-2 py-0.5 text-xs">{badge}</span> : null}
      meta={
        metric ? (
          <span className="tabular-nums text-xs text-muted-foreground">{metric}</span>
        ) : null
      }
      titleHeadingLevel={titleHeadingLevel}
    />
  );
}