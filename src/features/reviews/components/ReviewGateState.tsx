'use client';

import * as React from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/shared/utils/merge-class-names';

export interface ReviewGateStateProps {

quizTitle?: string;

startAttemptHref?: string;

onStartAttempt?: () => void;

onRetry?: () => void;

errorMessage?: string;

className?: string;
}

export function ReviewGateNotice({
quizTitle,
startAttemptHref,
onStartAttempt,
onRetry,
errorMessage,
className,
}: ReviewGateStateProps): React.ReactElement {
const hasLiveCta =
typeof startAttemptHref === 'string' ||
typeof onStartAttempt === 'function';

const heading = quizTitle
? `Complete an attempt before reviewing “${quizTitle}”`
: 'Complete an attempt before writing a review';

return (
<section
role='status'
aria-live='polite'
data-testid='review-gate-state'
className={cn(
'flex flex-col gap-3 rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-4',
className,
      )}
    >
<div className='flex flex-col gap-1'>
<h2 className='text-base font-semibold'>{heading}</h2>
<p className='text-sm text-muted-foreground'>
You can only review a quiz once you have a completed attempt
          for it. Finish a run, then come back to share your thoughts.
        </p>
</div>

{errorMessage ? (
<p
role='alert'
className='text-sm text-destructive'
data-testid='review-gate-state-error'
        >
{errorMessage}
</p>
      ) : null}

<div className='flex flex-wrap items-center gap-2'>
{hasLiveCta ? (
<Button
type='button'
variant='default'
size='sm'
onClick={onStartAttempt}
data-href={startAttemptHref ?? undefined}
data-testid='review-gate-state-cta'
          >
Start attempt
          </Button>
        ) : (
<Button
type='button'
variant='default'
size='sm'
disabled
aria-disabled='true'
data-testid='review-gate-state-cta-unavailable'
          >
Start attempt (coming soon)
          </Button>
        )}

{onRetry ? (
<Button
type='button'
variant='ghost'
size='sm'
onClick={onRetry}
data-testid='review-gate-state-retry'
          >
Try again
          </Button>
        ) : null}
</div>
</section>
  );
}
