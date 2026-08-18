'use client';

import { memo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { CheckCircle, XCircle, X, RotateCcw, AlertCircle } from 'lucide-react';
import type { BulkOperationResult } from '@/features/bookmarks/types';

interface BulkResultListProps {

results: BulkOperationResult[];

labels?: Record<string, string>;

onDismiss?: (index: number) => void;

onDismissAll?: () => void;

onRetryFailed?: (quizIds: string[]) => void;

isRetrying?: boolean;
}

function getSummaryCounts(results: BulkOperationResult[]): {
total: number;
succeeded: number;
failed: number;
} {
const succeeded = results.filter((r) => r.status === 'success').length;
const failed = results.filter((r) => r.status === 'error').length;
return { total: results.length, succeeded, failed };
}

const BulkResultList = memo(function BulkResultList({
results,
labels = {},
onDismiss,
onDismissAll,
onRetryFailed,
isRetrying = false,
}: BulkResultListProps) {
const [dismissedIndices, setDismissedIndices] = useState<Set<number>>(new Set());

const summary = getSummaryCounts(results);
const failedResults = results.filter((r) => r.status === 'error' && !dismissedIndices.has(r.index));
const visibleResults = results.filter((r) => !dismissedIndices.has(r.index));

const handleDismiss = useCallback(
(index: number) => {
setDismissedIndices((prev) => new Set([...prev, index]));
onDismiss?.(index);
    },
[onDismiss],
  );

const handleDismissAll = useCallback(() => {
const allFailedIndices = failedResults.map((r) => r.index);
setDismissedIndices((prev) => {
const next = new Set(prev);
allFailedIndices.forEach((i) => next.add(i));
return next;
    });
onDismissAll?.();
  }, [failedResults, onDismissAll]);

const handleRetryFailed = useCallback(() => {
const failedQuizIds = failedResults.map((r) => r.quizId);
onRetryFailed?.(failedQuizIds);
  }, [failedResults, onRetryFailed]);

if (results.length === 0) {
return null;
  }

return (
<div className='space-y-3'>
{/* Summary header */}
<div className='flex items-center justify-between'>
<div className='flex items-center gap-4 text-sm'>
<span className='flex items-center gap-1.5 text-green-600 dark:text-green-400'>
<CheckCircle className='h-4 w-4' aria-hidden='true' />
{summary.succeeded} succeeded
          </span>
{summary.failed > 0 && (
<span className='flex items-center gap-1.5 text-red-600 dark:text-red-400'>
<XCircle className='h-4 w-4' aria-hidden='true' />
{summary.failed} failed
            </span>
          )}
</div>

{/* Actions */}
<div className='flex items-center gap-2'>
{failedResults.length > 0 && onRetryFailed && (
<Button
variant='outline'
size='sm'
onClick={handleRetryFailed}
disabled={isRetrying}
className='gap-1.5'
            >
<RotateCcw className='h-3.5 w-3.5' aria-hidden='true' />
Retry failed
            </Button>
          )}
{failedResults.length > 0 && onDismissAll && (
<Button variant='ghost' size='sm' onClick={handleDismissAll}>
Dismiss all
            </Button>
          )}
</div>
</div>

{/* Results list */}
{visibleResults.length > 0 && (
<ScrollArea className='h-75 rounded-md border'>
<div className='p-3 space-y-2'>
{visibleResults.map((result) => {
const label = labels[result.quizId] || `Quiz ${result.quizId.slice(0, 8)}...`;
const isSuccess = result.status === 'success';
const isDismissed = dismissedIndices.has(result.index);

if (isDismissed) return null;

return (
<div
key={`${result.index}-${result.quizId}`}
className={`flex items-start gap-3 p-2 rounded-md ${
isSuccess
? 'bg-green-50 dark:bg-green-950/20'
: 'bg-red-50 dark:bg-red-950/20'
}`}
                >
{/* Status icon */}
{isSuccess ? (
<CheckCircle
className='h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5'
aria-hidden='true'
                    />
                  ) : (
<XCircle
className='h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5'
aria-hidden='true'
                    />
                  )}

{/* Content */}
<div className='flex-1 min-w-0'>
<p
className={`text-sm font-medium truncate ${
isSuccess ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
}`}
                    >
{label}
</p>
<p className='text-xs text-muted-foreground'>{result.message}</p>
{!isSuccess && result.code && (
<p className='text-xs text-red-500'>Code: {result.code}</p>
                    )}
</div>

{/* Dismiss button */}
{onDismiss && (
<button
onClick={() => handleDismiss(result.index)}
className='text-muted-foreground hover:text-foreground transition-colors p-1'
aria-label={`Dismiss ${label}`}
                    >
<X className='h-4 w-4' aria-hidden='true' />
</button>
                  )}
</div>
              );
            })}
</div>
</ScrollArea>
      )}

{/* Empty state after dismissing */}
{visibleResults.length === 0 && (
<div className='flex items-center justify-center py-8 text-sm text-muted-foreground'>
<AlertCircle className='h-4 w-4 mr-2' aria-hidden='true' />
All items dismissed
        </div>
      )}
</div>
  );
});

export default BulkResultList;
