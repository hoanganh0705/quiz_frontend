'use client';

import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

import { ApiError } from '@/lib/api/core/ApiError';
import { RequestIdBanner } from '@/features/admin/components/RequestIdBanner';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

import type { RankingJobStatus } from '../ranking-admin-types';

export interface RankingJobStatusPanelProps {

jobStatus: RankingJobStatus | null;

affectedUserCount: number | null;

error: ApiError | null;

requestId?: string;
}

function IdleState() {
return (
<div
data-testid="ranking-job-status-idle"
className="flex flex-col items-center justify-center rounded-md border border-dashed border-muted p-6 text-center"
    >
<p className="text-sm text-muted-foreground">
Run a ranking admin action to see results here.
      </p>
</div>
  );
}

function RunningState() {
return (
<div
data-testid="ranking-job-status-running"
className="flex flex-col items-center justify-center gap-3 rounded-md border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950"
    >
<div className="flex items-center gap-2">
<Loader2 className="h-5 w-5 animate-spin text-blue-600" aria-hidden="true" />
<span className="text-sm font-medium text-blue-700 dark:text-blue-300">
Processing…
        </span>
</div>
<Skeleton className="h-2 w-full max-w-xs rounded-full bg-blue-200 dark:bg-blue-800" />
</div>
  );
}

function CompletedState({ affectedUserCount }: { affectedUserCount: number | null }) {
return (
<div
data-testid="ranking-job-status-completed"
className="flex flex-col items-start gap-2 rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950"
    >
<div className="flex items-center gap-2">
<CheckCircle2
className="h-5 w-5 text-success dark:text-green-400"
aria-hidden="true"
        />
<Badge variant="default" className="bg-green-600 text-white">
Completed
        </Badge>
</div>
<p className="text-sm text-green-700 dark:text-green-300">
{affectedUserCount !== null
? `Affected ${affectedUserCount.toLocaleString()} user${affectedUserCount === 1 ? '' : 's'}.`
: 'All eligible users processed.'}
</p>
</div>
  );
}

function FailedState({ error, requestId }: { error: ApiError | null; requestId?: string }) {
return (
<div
data-testid="ranking-job-status-failed"
className="flex flex-col items-start gap-2 rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950"
    >
<div className="flex items-center gap-2">
<XCircle
className="h-5 w-5 text-destructive dark:text-red-400"
aria-hidden="true"
        />
<Badge variant="destructive">Failed</Badge>
</div>
<p className="text-sm text-red-700 dark:text-red-300">
{error?.detail ?? error?.message ?? 'An unexpected error occurred.'}
</p>
{requestId && error ? (
<RequestIdBanner error={error} />
      ) : null}
</div>
  );
}

export function RankingJobStatusPanel({
jobStatus,
affectedUserCount,
error,
requestId,
}: RankingJobStatusPanelProps) {

if (jobStatus === null) {
return <IdleState />;
  }

if (jobStatus === 'pending' || jobStatus === 'running') {
return <RunningState />;
  }

if (jobStatus === 'completed') {
return <CompletedState affectedUserCount={affectedUserCount} />;
  }

if (jobStatus === 'failed') {
return <FailedState error={error} requestId={requestId} />;
  }

return <IdleState />;
}
