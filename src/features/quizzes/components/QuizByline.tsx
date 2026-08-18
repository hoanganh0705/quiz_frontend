

'use client';

import Link from 'next/link';

import { cn } from '@/shared/utils/merge-class-names';

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
