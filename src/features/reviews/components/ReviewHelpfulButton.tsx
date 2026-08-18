'use client';

import * as React from 'react';
import { ThumbsUp } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/shared/utils/merge-class-names';

export interface ReviewHelpfulButtonProps {

reviewId: string;

helpfulCount: number;

viewerMarkedHelpful: boolean;

isPending: boolean;

isOwner?: boolean;

isAuthenticated?: boolean;

onToggle: () => void;

className?: string;

ariaLabel?: string;
}

export function ReviewHelpfulButton({
reviewId,
helpfulCount,
viewerMarkedHelpful,
isPending,
isOwner = false,
isAuthenticated = true,
onToggle,
className,
ariaLabel,
}: ReviewHelpfulButtonProps): React.ReactElement {

if (isOwner) {
return (
<span
aria-label={`${helpfulCount} people found this helpful`}
data-testid={`review-helpful-count-${reviewId}`}
className={cn(
'inline-flex items-center gap-1 text-xs text-muted-foreground',
className,
        )}
      >
<ThumbsUp aria-hidden='true' className='size-3' />
<span>{helpfulCount}</span>
</span>
    );
  }

if (!isAuthenticated) {
return (
<span
aria-label={`${helpfulCount} people found this helpful`}
data-testid={`review-helpful-count-${reviewId}`}
className={cn(
'inline-flex items-center gap-1 text-xs text-muted-foreground',
className,
        )}
      >
<ThumbsUp aria-hidden='true' className='size-3' />
<span>{helpfulCount}</span>
</span>
    );
  }

return (
<Button
type='button'
variant={viewerMarkedHelpful ? 'secondary' : 'ghost'}
size='sm'
onClick={onToggle}
disabled={isPending}
aria-pressed={viewerMarkedHelpful}
aria-busy={isPending || undefined}
aria-label={ariaLabel ?? `Helpful (${helpfulCount})`}
data-testid={`review-helpful-button-${reviewId}`}
className={cn(
'inline-flex items-center gap-1 px-2 py-1 text-xs',
viewerMarkedHelpful && 'bg-secondary/70',
className,
      )}
    >
<ThumbsUp
aria-hidden='true'
className={cn(
'size-3 transition-colors',
viewerMarkedHelpful
? 'fill-current text-current'
: 'text-muted-foreground',
        )}
      />
<span aria-hidden='true'>{helpfulCount}</span>
</Button>
  );
}
