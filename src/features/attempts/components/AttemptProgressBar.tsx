'use client';

import * as React from 'react';

import { cn } from '@/shared/utils/merge-class-names';

export interface AttemptProgressBarProps {

totalQuestions: number;

currentIndex: number;

submittedCount: number;

className?: string;
}

export function AttemptProgressBar(
props: AttemptProgressBarProps,
): React.ReactElement {
const { totalQuestions, currentIndex, submittedCount, className } = props;

if (totalQuestions <= 0) {
return (
<div
className={cn('w-full space-y-2', className)}
data-testid="attempt-progress-bar"
role="group"
aria-label="Attempt progress"
      >
<div
className="h-2 w-full rounded-full bg-muted"
role="progressbar"
aria-valuemin={0}
aria-valuemax={0}
aria-valuenow={0}
aria-label="Question position"
        />
<p className="text-xs text-muted-foreground">
No questions yet.
        </p>
</div>
    );
  }

const safeIndex = Math.min(Math.max(currentIndex, 0), totalQuestions - 1);
const positionPercent = Math.round(((safeIndex + 1) / totalQuestions) * 100);
const submittedPercent = Math.min(
Math.max(Math.round((submittedCount / totalQuestions) * 100), 0),
100,
  );

return (
<div
className={cn('w-full space-y-2', className)}
data-testid="attempt-progress-bar"
role="group"
aria-label="Attempt progress"
    >
<div
className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
role="progressbar"
aria-valuemin={0}
aria-valuemax={totalQuestions}
aria-valuenow={safeIndex + 1}
aria-label={`Question ${safeIndex + 1} of ${totalQuestions}`}
      >
{/* Position indicator: lighter band covering the current index. */}
<div
className="absolute inset-y-0 left-0 bg-primary/30"
style={{ width: `${positionPercent}%` }}
        />
{/* Submitted indicator: solid band up to the submitted count. */}
<div
className="absolute inset-y-0 left-0 bg-primary"
style={{ width: `${submittedPercent}%` }}
        />
</div>
<div className="flex items-center justify-between text-xs text-muted-foreground">
<span data-testid="attempt-progress-bar-position">
Question {safeIndex + 1} of {totalQuestions}
</span>
<span data-testid="attempt-progress-bar-submitted">
{submittedCount} submitted
        </span>
</div>
</div>
  );
}