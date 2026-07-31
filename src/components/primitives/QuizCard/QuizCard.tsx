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
}

export function QuizCard({ quiz, className, ...rest }: QuizCardProps) {
  const href = `/quizzes/${quiz.slug || quiz.quizId}`
  const difficulty = quiz.publishedVersion?.difficulty
  const duration = formatDuration(quiz.publishedVersion?.durationMs)

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
    </Link>
  )
}