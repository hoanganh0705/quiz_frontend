"use client";

import Link from "next/link";

import {
  BookmarkButtonSlot,
  type BookmarkButtonSlotProps,
} from "@/components/primitives/BookmarkButton";
import { cn } from "@/shared/utils/merge-class-names";
import type { QuizListItemDto } from "@/lib/api/generated/schemas";

const CARD_OUTER =
  "group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:shadow-md";
const COVER_BASE = "relative aspect-[16/9] w-full overflow-hidden bg-muted";
const COVER_IMG = "h-full w-full object-cover";
const COVER_FALLBACK =
  "flex h-full w-full items-center justify-center text-lg font-semibold uppercase text-muted-foreground";
const BODY = "flex flex-1 flex-col gap-2 p-4";
const TITLE = "line-clamp-2 text-base font-semibold leading-snug";
const DESCRIPTION = "line-clamp-2 text-sm text-muted-foreground";
const META_ROW =
  "mt-auto flex items-center gap-2 text-xs text-muted-foreground";
const BADGE = "rounded-full border bg-background px-2 py-0.5 text-xs";
const BOOKMARK_SLOT =
  "absolute right-2 top-2 z-10 rounded-md bg-card/80 p-1 backdrop-blur-sm";

function initialsFromQuiz(quiz: QuizListItemDto): string {
  const seed = quiz.quizId.replace(/-/g, "").slice(-6);
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const a = chars[hash % chars.length];
  const b = chars[(hash >>> 8) % chars.length];
  return `${a}${b}`;
}

function formatDuration(durationMs: number | undefined): string | null {
  if (typeof durationMs !== "number" || durationMs <= 0) return null;
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export interface QuizCardProps extends Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> {
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
  ...rest
}: QuizCardProps) {
  const href = `/quizzes/${quiz.slug || quiz.quizId}`;
  const difficulty = quiz.publishedVersion?.difficulty;
  const duration = formatDuration(quiz.publishedVersion?.durationMs);

  const renderBookmarkSlot =
    bookmarkSlot === undefined
      ? (props: BookmarkButtonSlotProps) => <BookmarkButtonSlot {...props} />
      : bookmarkSlot;

  return (
    <Link
      href={href}
      className={cn(CARD_OUTER, className)}
      aria-label={quiz.title}
      data-testid="quiz-card"
      data-quiz-id={quiz.quizId}
      data-quiz-slug={quiz.slug}
      {...rest}
    >
      <div className={COVER_BASE}>
        {quiz.imageUrl ? (
          // Plain <img> (not next/image) so the primitive works inside
          // demo routes and unit tests without remote-pattern config.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={quiz.imageUrl}
            alt=""
            loading="lazy"
            className={COVER_IMG}
          />
        ) : (
          <span aria-hidden="true" className={COVER_FALLBACK}>
            {initialsFromQuiz(quiz)}
          </span>
        )}
      </div>
      <div className={BODY}>
        <h3 className={TITLE}>{quiz.title}</h3>
        {quiz.description ? (
          <p className={DESCRIPTION}>{quiz.description}</p>
        ) : null}
        <div className={META_ROW}>
          {quiz.isVerified ? (
            <span className={BADGE} aria-label="Verified">
              Verified
            </span>
          ) : null}
          {quiz.isFeatured ? (
            <span className={BADGE} aria-label="Featured">
              Featured
            </span>
          ) : null}
          {difficulty ? <span className={BADGE}>{difficulty}</span> : null}
          {duration ? (
            <span className="ml-auto tabular-nums">{duration}</span>
          ) : null}
        </div>
      </div>
      {renderBookmarkSlot ? (
        <div className={BOOKMARK_SLOT}>
          {renderBookmarkSlot({
            quizId: quiz.quizId,
            variant: "card",
          })}
        </div>
      ) : null}
    </Link>
  );
}
