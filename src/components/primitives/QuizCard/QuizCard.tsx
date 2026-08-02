'use client'

/**
 * <QuizCard /> — the resolved visual representation of a QuizListItemDto.
 *
 * Source story: PHASE_3_EPICS.md → Story 3.1.
 * Source ticket: TKT-3.1.C1.
 *
 * Renders cover image (with deterministic initials fallback when absent),
 * title (clamped to two lines, full title exposed via aria-label),
 * description (collapsed when absent), category badge, and a metadata row
 * surfacing published-version difficulty + estimated duration. The whole
 * card is wrapped in a single Next.js `<Link>` to `/quizzes/[slug|id]`
 * so the click target covers the entire surface.
 *
 * Story 3.10 / TKT-3.10.E1 — a bookmark slot is overlaid in the
 * card's top-right corner. The slot reserves no flow space (absolute
 * positioning + zero flow participation) so Story 3.1 AC #4 ("Lighthouse
 * no CLS") remains green for every state — filled, outlined, loading,
 * disabled, pending. Card-variant click suppression is owned by the
 * slot (D4 AC #5); the Link wrapper does not need to know about it.
 *
 * Drift notes (from TKT-3.1.A1 evidence):
 *   - QuizListItemDto top-level fields available here: title, slug,
 *     imageUrl, description, isFeatured, isVerified, publishedVersionId,
 *     publishedVersion?.difficulty, publishedVersion?.durationMs.
 *   - questionCount / attemptCount / averageRating / difficulty are NOT
 *     at the top level; difficulty + duration come from the nested
 *     publishedVersion summary when present.
 *   - The identifier field is quizId (not id).
 */

import Link from 'next/link'

import {
  BookmarkButtonSlot,
  type BookmarkButtonSlotProps,
} from '@/components/primitives/BookmarkButton'
import { cn } from '@/shared/utils/merge-class-names'
import type { QuizListItemDto } from '@/lib/api/generated/schemas'

const CARD_OUTER =
  'group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:shadow-md'
const COVER_BASE =
  'relative aspect-[16/9] w-full overflow-hidden bg-muted'
const COVER_IMG = 'h-full w-full object-cover'
const COVER_FALLBACK =
  'flex h-full w-full items-center justify-center text-lg font-semibold uppercase text-muted-foreground'
const BODY = 'flex flex-1 flex-col gap-2 p-4'
const TITLE = 'line-clamp-2 text-base font-semibold leading-snug'
const DESCRIPTION = 'line-clamp-2 text-sm text-muted-foreground'
const META_ROW =
  'mt-auto flex items-center gap-2 text-xs text-muted-foreground'
const BADGE = 'rounded-full border bg-background px-2 py-0.5 text-xs'
// Bookmark slot is absolutely-positioned so it doesn't claim any layout
// space — Story 3.1 AC #4 ("Lighthouse no CLS") must remain green for
// every state (filled, outlined, loading, disabled, pending) since the
// slot reserves no flow space. The top-right corner mirrors the
// canonical Phase 3 card action placement.
const BOOKMARK_SLOT =
  'absolute right-2 top-2 z-10 rounded-md bg-card/80 p-1 backdrop-blur-sm'

function initialsFromQuiz(quiz: QuizListItemDto): string {
  // Deterministic per-id initials so server and client agree on the
  // fallback without hydration mismatch.
  const seed = quiz.quizId.replace(/-/g, '').slice(-6)
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const a = chars[hash % chars.length]
  const b = chars[(hash >>> 8) % chars.length]
  return `${a}${b}`
}

function formatDuration(durationMs: number | undefined): string | null {
  if (typeof durationMs !== 'number' || durationMs <= 0) return null
  const totalSeconds = Math.round(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  if (seconds === 0) return `${minutes}m`
  return `${minutes}m ${seconds}s`
}

export interface QuizCardProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  quiz: QuizListItemDto
  className?: string
  /**
   * Optional override for the bookmark slot rendered in the card's
   * top-right corner. The default is the feature-aware
   * `<BookmarkButtonSlot />` from Story 3.10 (D4). Pass `null` to
   * suppress the bookmark control entirely (e.g. for read-only
   * previews).
   *
   * Story 3.10 / TKT-3.10.E1 — the slot is invoked with `quizId` from
   * the quiz DTO and the default `variant="card"`, which suppresses the
   * parent's `<Link>` click. The card surface does not need to know
   * about the slot's internals.
   */
  bookmarkSlot?: ((props: BookmarkButtonSlotProps) => React.JSX.Element | null) | null
}

export function QuizCard({
  quiz,
  className,
  bookmarkSlot,
  ...rest
}: QuizCardProps) {
  const href = `/quizzes/${quiz.slug || quiz.quizId}`
  const difficulty = quiz.publishedVersion?.difficulty
  const duration = formatDuration(quiz.publishedVersion?.durationMs)

  // Resolve the bookmark slot component. The default is the
  // Story 3.10 feature-aware slot; `null` renders nothing.
  const renderBookmarkSlot =
    bookmarkSlot === undefined
      ? (props: BookmarkButtonSlotProps) => (
          <BookmarkButtonSlot {...props} />
        )
      : bookmarkSlot;

  return (
    <Link
      href={href}
      className={cn(CARD_OUTER, className)}
      aria-label={quiz.title}
      data-testid='quiz-card'
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
            alt=''
            loading='lazy'
            className={COVER_IMG}
          />
        ) : (
          <span aria-hidden='true' className={COVER_FALLBACK}>
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
            <span className={BADGE} aria-label='Verified'>
              Verified
            </span>
          ) : null}
          {quiz.isFeatured ? (
            <span className={BADGE} aria-label='Featured'>
              Featured
            </span>
          ) : null}
          {difficulty ? (
            <span className={BADGE}>{difficulty}</span>
          ) : null}
          {duration ? (
            <span className='ml-auto tabular-nums'>{duration}</span>
          ) : null}
        </div>
      </div>
      {renderBookmarkSlot ? (
        <div className={BOOKMARK_SLOT}>
          {renderBookmarkSlot({
            quizId: quiz.quizId,
            variant: 'card',
          })}
        </div>
      ) : null}
    </Link>
  )
}