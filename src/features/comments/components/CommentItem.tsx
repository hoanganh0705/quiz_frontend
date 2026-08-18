'use client';

import { useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/shared/utils/merge-class-names';
import { formatRelativeTime } from '@/shared/utils/date-utils';

import { CommentDeletedPlaceholder } from './CommentDeletedPlaceholder';
import { CommentEditInline } from './CommentEditInline';
import { CommentReplyForm } from './CommentReplyForm';
import { CommentReportDialog } from './CommentReportDialog';
import { CommentVoteButtons } from './CommentVoteButtons';
import type {
CommentItem as CommentItemType,
CommentThreadItem,
CommentUserVote,
} from '@/features/comments/types';

export interface CommentItemProps {

comment: CommentThreadItem | CommentItemType;

depth?: 0 | 1;

currentUserId?: string | null;

isAuthenticated: boolean;

onDeleted?: (commentId: string) => void;

onReplied?: (parentCommentId: string) => void;

quizId: string;

className?: string;
}

const HIDDEN_BY_MODERATOR_LABEL = '[Comment hidden by moderator]';
const MAX_BODY_LENGTH_TOP = 2000;
const MAX_BODY_LENGTH_REPLY = 1000;

export function CommentItem ({
comment,
depth = 0,
currentUserId,
isAuthenticated,
onDeleted,
onReplied,
quizId,
className,
}: CommentItemProps) {
const [reportOpen, setReportOpen] = useState(false);
const [reported, setReported] = useState(false);

const isOwner = currentUserId === comment.authorId;
const isReply = depth === 1;
const isDeleted = comment.deletedAt !== null;
const isHidden = comment.isHidden;

const userVote: CommentUserVote = (comment as CommentThreadItem).userVote ?? null;

const authorDisplayName = stringOrFallback(
comment.author.displayName,
comment.author.username,
  );
const authorAvatarUrl = stringOrNull(comment.author.avatarUrl);

return (
<article
className={cn(
'flex flex-col gap-3',
isReply && 'opacity-90',
isDeleted && 'opacity-75',
className,
      )}
data-testid={`comment-item-${comment.id}`}
data-depth={depth}
data-owner={isOwner ? 'true' : 'false'}
data-deleted={isDeleted ? 'true' : 'false'}
data-hidden={isHidden ? 'true' : 'false'}
    >
{/* ─── Header: avatar + author + timestamp ───────────────────── */}
<header className='flex items-start gap-3'>
<Avatar className='h-8 w-8 shrink-0' aria-hidden>
{authorAvatarUrl ? (
<AvatarImage
src={authorAvatarUrl}
alt={authorDisplayName}
            />
          ) : null}
<AvatarFallback className='text-xs'>
{initials(authorDisplayName)}
</AvatarFallback>
</Avatar>
<div className='min-w-0 flex-1'>
<div className='flex items-center gap-2 flex-wrap'>
<p className='text-sm font-medium text-foreground'>
{authorDisplayName}
</p>
{isOwner && (
<span
className='text-xs font-normal px-1.5 py-0.5 bg-primary/10 text-primary rounded'
data-testid={`comment-item-self-tag-${comment.id}`}
              >
you
              </span>
            )}
<span className='text-xs text-muted-foreground'>·</span>
<time
className='text-xs text-muted-foreground'
dateTime={comment.createdAt}
title={comment.createdAt}
            >
{formatRelativeTime(comment.createdAt)}
</time>
</div>
</div>
</header>

{/* ─── Body / deleted / hidden placeholders ─────────────────── */}
<div className='pl-11'>
{isDeleted ? (
<CommentDeletedPlaceholder />
        ) : isHidden ? (
<p
className='text-sm italic text-muted-foreground'
data-testid={`comment-item-hidden-${comment.id}`}
role='status'
          >
<span aria-hidden>{HIDDEN_BY_MODERATOR_LABEL}</span>
<span className='sr-only'>
This comment was hidden by a moderator.
            </span>
</p>
        ) : (
<p
className='text-sm text-foreground leading-relaxed'
data-testid={`comment-item-body-${comment.id}`}
data-test-body-length={comment.body.length}
          >
{comment.body}
</p>
        )}
</div>

{/* ─── Footer: controls (hidden when the comment is gone) ───── */}
{!isDeleted && !isHidden && (
<footer className='pl-11 flex flex-wrap items-center gap-3 text-xs'>
<CommentVoteButtons
commentId={comment.id}
userVote={userVote}
votesCount={comment.votesCount}
upvotesCount={comment.upvotesCount}
downvotesCount={comment.downvotesCount}
isOwner={isOwner}
size={isReply ? 'sm' : 'md'}
          />

{isAuthenticated && !isOwner && (
reported ? (
<span
className='inline-flex items-center gap-1 text-muted-foreground'
data-testid={`comment-item-reported-${comment.id}`}
aria-label='You reported this comment'
              >
<Flag size={12} aria-hidden />
Reported
              </span>
            ) : (
<button
type='button'
className='text-muted-foreground hover:text-destructive transition-colors'
onClick={() => setReportOpen(true)}
data-testid={`comment-item-report-${comment.id}`}
              >
Report
              </button>
            )
          )}

{isOwner && (
<CommentEditInline
commentId={comment.id}
initialBody={comment.body}
parentCommentId={isReply ? comment.parentCommentId ?? null : null}
isOwner={isOwner}
maxLength={isReply ? MAX_BODY_LENGTH_REPLY : MAX_BODY_LENGTH_TOP}
onDeleted={() => onDeleted?.(comment.id)}
            />
          )}
</footer>
      )}

{/* ─── Reply composer (top-level only, authenticated only) ────── */}
{!isDeleted && !isHidden && depth === 0 && isAuthenticated && (
<div className='pl-11' data-testid={`comment-item-reply-form-${comment.id}`}>
<CommentReplyForm
quizId={quizId}
parentCommentId={comment.id}
repliesCount={comment.repliesCount}
onReplied={() => onReplied?.(comment.id)}
          />
</div>
      )}

<CommentReportDialog
commentId={comment.id}
isOpen={reportOpen}
onClose={() => setReportOpen(false)}
onReported={() => {
setReported(true);
        }}
      />
</article>
  );
}

function initials(name: string): string {
const parts = name.trim().split(/\s+/).filter(Boolean);
if (parts.length === 0) return '?';
if (parts.length === 1) return (parts[0]?.[0] ?? '?').toUpperCase();
const first = parts[0]?.[0] ?? '';
const last = parts[parts.length - 1]?.[0] ?? '';
return (first + last).toUpperCase();
}

function stringOrFallback(
value: unknown,
fallback: string,
): string {
if (typeof value === 'string' && value.length > 0) return value;
return fallback;
}

function stringOrNull(value: unknown): string | null {
if (typeof value === 'string' && value.length > 0) return value;
return null;
}

export function CommentItemSkeleton({ depth = 0 }: { depth?: 0 | 1 }) {
return (
<div
className={cn(
'flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-xs',
depth === 1 && 'pl-6 sm:pl-8 border-l-2 border-l-muted',
      )}
aria-busy='true'
data-testid={`comment-item-skeleton-${depth}`}
    >
<div className='flex items-center gap-3'>
<Skeleton className='h-9 w-9 rounded-full' />
<div className='flex flex-1 flex-col gap-1'>
<Skeleton className='h-3 w-24' />
<Skeleton className='h-3 w-16' />
</div>
</div>
<div className='flex flex-col gap-2'>
<Skeleton className='h-3 w-full' />
<Skeleton className='h-3 w-11/12' />
<Skeleton className='h-3 w-2/3' />
</div>
<div className='flex items-center gap-2'>
<Skeleton className='h-6 w-16 rounded-md' />
<Skeleton className='h-6 w-16 rounded-md' />
<Loader2 className='ml-auto hidden' aria-hidden />
</div>
</div>
  );
}