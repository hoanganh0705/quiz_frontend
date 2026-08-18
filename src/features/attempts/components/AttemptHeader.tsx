'use client';

import * as React from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/shared/utils/merge-class-names';

import type { AttemptRunnerStatus } from '@/features/attempts/types/attempt-runner.types';

export interface AttemptHeaderProps {

title: string;

status: AttemptRunnerStatus;

onAbandon: () => void;

className?: string;
}

export function AttemptHeader(
props: AttemptHeaderProps,
): React.ReactElement {
const { title, status, onAbandon, className } = props;

const transient = status === 'starting' || status === 'submitting'
|| status === 'abandoning' || status === 'completing';

return (
<header
className={cn(
'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
className,
      )}
data-testid="attempt-header"
    >
<div className="min-w-0">
<h2 className="truncate text-lg font-semibold" data-testid="attempt-header-title">
{title}
</h2>
<p
className="text-xs text-muted-foreground"
data-testid="attempt-header-status"
        >
{describeStatus(status)}
</p>
</div>
<div className="flex items-center gap-2">
<Button
type="button"
variant="destructive"
size="sm"
disabled={transient || status === 'abandoned'}
onClick={onAbandon}
data-testid="attempt-header-abandon"
aria-label="Abandon attempt"
        >
Abandon attempt
        </Button>
</div>
</header>
  );
}

function describeStatus(status: AttemptRunnerStatus): string {
switch (status) {
case 'idle':
return 'Ready to start';
case 'starting':
return 'Starting attempt…';
case 'in_progress':
return 'In progress';
case 'submitting':
return 'Submitting answer…';
case 'abandoning':
return 'Abandoning attempt…';
case 'completing':
return 'Completing attempt…';
case 'completed':
return 'Completed';
case 'abandoned':
return 'Abandoned';
case 'error':
return 'Something went wrong';
  }
}