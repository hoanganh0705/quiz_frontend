'use client';

import * as React from 'react';
import { AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/shared/utils/merge-class-names';
import { getUserCopy } from '@/lib/api/error-codes';
import type { BulkError } from '@/lib/forms/useQuizForm';

export interface BulkErrorListProps {

bulkError: readonly BulkError[];

onReSubmitFailed: () => void;

onDismiss: () => void;

className?: string;

testId?: string;
}

export function BulkErrorList({
bulkError,
onReSubmitFailed,
onDismiss,
className,
testId = 'bulk-error-list',
}: BulkErrorListProps): React.ReactElement | null {
if (bulkError.length === 0) return null;

return (
<section
role='alert'
aria-label='Bulk submission errors'
data-testid={testId}
data-bulk-error-count={bulkError.length}
className={cn(
'rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm',
className
      )}
    >
<header className='flex items-center justify-between gap-2 mb-2'>
<h2
className='font-semibold flex items-center gap-2'
data-testid={`${testId}-title`}
        >
<AlertCircle
className='h-4 w-4 text-destructive'
aria-hidden='true'
          />
{bulkError.length} {bulkError.length === 1 ? 'row' : 'rows'} failed
        </h2>
<div className='flex items-center gap-1'>
<Button
type='button'
variant='outline'
size='sm'
onClick={onDismiss}
data-testid={`${testId}-dismiss`}
          >
Dismiss
          </Button>
<Button
type='button'
size='sm'
onClick={onReSubmitFailed}
data-testid={`${testId}-resubmit-failed`}
          >
Re-submit failed only
          </Button>
</div>
</header>
<ol
role='list'
className='space-y-2'
data-testid={`${testId}-items`}
      >
{bulkError.map((err) => {
const copy = getUserCopy(err.code);
return (
<li
key={`${err.index}-${err.code}-${err.field ?? ''}`}
role='listitem'
data-testid={`${testId}-item-${err.index}`}
className='flex items-start gap-2 rounded-md border border-destructive/20 bg-background p-2'
            >
<Badge
variant='destructive'
className='shrink-0 font-mono'
aria-label={`Row ${err.index}`}
              >
#{err.index}
</Badge>
<div className='flex-1 space-y-0.5'>
<p
className='font-medium'
data-testid={`${testId}-item-${err.index}-title`}
                >
{copy.title}
</p>
<p
className='text-xs text-muted-foreground'
data-testid={`${testId}-item-${err.index}-message`}
                >
{err.message}
</p>
{err.field ? (
<p
className='text-xs'
data-testid={`${testId}-item-${err.index}-field`}
                  >
<span className='text-muted-foreground'>Field: </span>
<code className='font-mono'>{err.field}</code>
</p>
                ) : null}
</div>
<span
className='text-xs font-mono text-muted-foreground shrink-0'
aria-label={`HTTP status ${err.status}`}
              >
{err.status > 0 ? err.status : '—'}
</span>
</li>
          );
        })}
</ol>
</section>
  );
}