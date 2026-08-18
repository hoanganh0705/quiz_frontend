'use client';

import * as React from 'react';
import { Lock } from 'lucide-react';

import { cn } from '@/shared/utils/merge-class-names';

export interface ReadOnlyBannerProps {

reason?: string;

className?: string;

testId?: string;
}

export function ReadOnlyBanner({
reason,
className,
testId = 'read-only-banner',
}: ReadOnlyBannerProps): React.ReactElement {
const tooltipText = reason
? `This quiz is no longer editable (${reason}).`
: 'This quiz is no longer editable.';

return (
<div
role='status'
aria-live='polite'
data-testid={testId}
data-read-only-banner-reason={reason ?? 'unknown'}
className={cn(
'flex items-start gap-2 rounded-md border border-muted-foreground/30 bg-muted/40 p-3 text-sm text-muted-foreground',
className
      )}
    >
<span
className='inline-flex mt-0.5 shrink-0'
title={tooltipText}
aria-hidden='true'
data-testid={`${testId}-lock`}
      >
<Lock className='h-4 w-4' />
</span>
<div className='flex-1 space-y-1'>
<p
className='font-semibold leading-none text-foreground'
data-testid={`${testId}-title`}
        >
This quiz is no longer editable
        </p>
<p className='text-xs' data-testid={`${testId}-body`}>
The quiz has been deleted, archived, or its version is
          immutable. You can view the form, but changes cannot be
          saved.
        </p>
{reason ? (
<span
className='block text-[0.7rem] font-mono text-muted-foreground/80'
data-testid={`${testId}-reason`}
title={tooltipText}
          >
reason: {reason}
</span>
        ) : null}
</div>
</div>
  );
}
