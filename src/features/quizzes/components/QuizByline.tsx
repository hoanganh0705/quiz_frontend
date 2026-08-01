/**
 * `QuizByline` — public author byline with deleted-author fallback.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.C2.
 *
 * Renders only the approved public author summary and the exact
 * "Anonymous" fallback when the author reference is missing or
 * deleted. The live `QuizResponseDto` does not expose author handle
 * or avatar (see `EPIC_3_6_A1.md` §6). When the backend begins
 * returning a public author summary on the detail payload, the
 * caller wires it into `<QuizByline author={...} />`.
 *
 * ## Public-summary contract
 *
 * The `PublicAuthorSummary` props type is a tiny DTO that only
 * carries fields safe to render in a public context:
 *
 *   - `userId` — used to build the profile link href.
 *   - `handle` — display name.
 *   - `avatarUrl` — optional remote URL; the component renders
 *     initials when this is null/empty.
 *
 * Private profile fields (email, role, settings, auth state, etc.)
 * are intentionally not part of this type. The component must
 * never accept them.
 *
 * ## Acceptance summary
 *
 *   - Present author → handle + avatar, link to public profile.
 *   - Missing/deleted author → exactly the text "Anonymous" with
 *     no broken image and no profile link.
 */

'use client';

import Link from 'next/link';

import { cn } from '@/shared/utils/merge-class-names';

/**
 * Public-author summary. Intentionally minimal: only fields that
 * are safe to render in a player-facing detail page.
 */
export interface PublicAuthorSummary {
  userId: string;
  handle: string;
  avatarUrl: string | null;
}

const BYLINE_OUTER =
  'flex items-center gap-3 text-sm text-muted-foreground';
const AVATAR_WRAPPER =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold text-muted-foreground';
const AVATAR_IMG = 'h-full w-full object-cover';
const HANDLE = 'font-medium text-foreground';
const LINK = 'inline-flex items-center gap-3 rounded-full transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const ANONYMOUS = 'italic text-muted-foreground';

export interface QuizBylineProps {
  author: PublicAuthorSummary | null;
  className?: string;
}

function initialsFromHandle(handle: string): string {
  const cleaned = handle.trim();
  if (cleaned.length === 0) return '?';
  // First letter of the first whitespace-separated word.
  return cleaned.charAt(0).toUpperCase();
}

export function QuizByline({ author, className }: QuizBylineProps) {
  if (author === null) {
    return (
      <p
        className={cn(BYLINE_OUTER, className)}
        data-testid='quiz-byline'
        data-author-state='anonymous'
      >
        <span className={AVATAR_WRAPPER} aria-hidden='true' />
        <span className={ANONYMOUS}>Anonymous</span>
      </p>
    );
  }

  const href = `/users/${author.userId}`;
  const altText = `${author.handle}'s avatar`;
  const initials = initialsFromHandle(author.handle);

  return (
    <Link
      href={href}
      className={cn(BYLINE_OUTER, LINK, className)}
      data-testid='quiz-byline'
      data-author-state='present'
      data-author-id={author.userId}
      aria-label={`View ${author.handle}'s public profile`}
    >
      <span className={AVATAR_WRAPPER}>
        {author.avatarUrl ? (
          // Plain <img> (not next/image) so the primitive works
          // inside unit tests without remote-pattern config.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={author.avatarUrl}
            alt={altText}
            className={AVATAR_IMG}
          />
        ) : (
          <span aria-hidden='true'>{initials}</span>
        )}
      </span>
      <span className={HANDLE}>{author.handle}</span>
    </Link>
  );
}
