'use client';

import { Star } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/shared/utils/merge-class-names';
import { formatRelativeTime } from '@/shared/utils/date-utils';

import { ReviewEditInline } from '@/features/reviews/components/ReviewEditInline';
import { ReviewHelpfulButton } from '@/features/reviews/components/ReviewHelpfulButton';
import { useHelpfulReview } from '@/features/reviews/hooks/useHelpfulReview';
import type {
MyReviewDto,
ReviewDto,
} from '@/features/reviews/types';

export interface ReviewItemProps {
review: ReviewDto;

currentUserId: string | null;

ownerReview?: MyReviewDto;

className?: string;

onDeleted?: () => void;
}

const MAX_COMMENT_LENGTH = 2000;
const REMOVED_PLACEHOLDER = '[removed]';

export function ReviewItem({
review,
currentUserId,
ownerReview,
onDeleted,
className,
}: ReviewItemProps): React.ReactElement {
const isOwner =
typeof currentUserId === 'string' &&
currentUserId === review.userId;

const helpfulCount = review.helpfulCount;

const isAuthenticated = typeof currentUserId === 'string';

const helpful = useHelpfulReview({
quizId: review.quizId,
reviewId: review.reviewId,
initialViewerMarkedHelpful: false,
  });

return (
<article
className={cn(
'flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-xs',
className,
      )}
data-testid={`review-item-${review.reviewId}`}
data-owner={isOwner ? 'true' : undefined}
    >
<header className='flex items-start justify-between gap-2'>
<div className='flex items-center gap-2'>
<Avatar className='size-8'>
{review.userAvatarUrl ? (
<AvatarImage src={review.userAvatarUrl} alt={`${review.username} avatar`} />
            ) : null}
<AvatarFallback>{initialsFor(review.username)}</AvatarFallback>
</Avatar>
<div className='flex flex-col'>
<span className='text-sm font-medium text-foreground' data-testid={`review-item-author-${review.reviewId}`}>
{review.username}
</span>
<time
dateTime={review.createdAt}
className='text-xs text-muted-foreground tabular-nums'
data-testid={`review-item-date-${review.reviewId}`}
            >
{formatRelativeTime(review.createdAt)}
</time>
</div>
</div>
<div
className='flex items-center gap-0.5 text-amber-500'
aria-label={`${review.rating} out of 5 stars`}
data-testid={`review-item-rating-${review.reviewId}`}
        >
{Array.from({ length: 5 }, (_, idx) => (
<Star
key={idx}
size={16}
fill={idx < review.rating ? 'currentColor' : 'none'}
strokeWidth={idx < review.rating ? 0 : 2}
aria-hidden
            />
          ))}
</div>
</header>

{review.comment && review.comment.trim().length > 0 ? (
<p
className='whitespace-pre-wrap break-words text-sm text-foreground'
data-testid={`review-item-body-${review.reviewId}`}
        >
{clampReviewText(review.comment, MAX_COMMENT_LENGTH)}
</p>
      ) : null}

<footer className='mt-1 flex items-center justify-between'>
{isOwner ? (
ownerReview ? (
<ReviewEditInline review={ownerReview} onDeleted={onDeleted} />
          ) : null
        ) : (
<ReviewHelpfulButton
reviewId={review.reviewId}
helpfulCount={helpfulCount}
viewerMarkedHelpful={helpful.viewerMarkedHelpful}
isPending={helpful.isPending}
isOwner={isOwner}
isAuthenticated={isAuthenticated}
onToggle={() => {
void helpful.toggle();
            }}
          />
        )}
</footer>
</article>
  );
}

function initialsFor(name: string): string {
if (!name) return '?';
const trimmed = name.trim();
if (!trimmed) return '?';
const parts = trimmed.split(/\s+/);
if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
const first = parts[0]?.[0] ?? '';
const last = parts[parts.length - 1]?.[0] ?? '';
return (first + last).toUpperCase();
}

function clampReviewText(text: string, max: number): string {
if (text.length <= max) return text;
return `${text.slice(0, max - 1).trimEnd()}…`;
}

export const REVIEW_REMOVED_PLACEHOLDER = REMOVED_PLACEHOLDER;

export function ReviewItemSkeleton({
className,
}: {
className?: string;
}): React.ReactElement {
return (
<div
className={cn(
'flex flex-col gap-2 rounded-lg border bg-card/60 p-4 shadow-xs',
className,
      )}
data-testid='review-item-skeleton'
aria-hidden
    >
<div className='flex items-center gap-2'>
<Skeleton className='size-8 rounded-full' />
<div className='flex flex-col gap-1'>
<Skeleton className='h-3 w-24' />
<Skeleton className='h-3 w-16' />
</div>
</div>
<Skeleton className='h-3 w-full' />
<Skeleton className='h-3 w-11/12' />
<Skeleton className='h-3 w-2/3' />
</div>
  );
}