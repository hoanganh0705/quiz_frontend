'use client';

import { AlertCircle } from 'lucide-react';

import { ApiError } from '@/lib/api/core/ApiError';
import { RequestIdBanner } from '@/features/admin/components/RequestIdBanner';

export interface ReviewReportErrorStateProps {

error: ApiError;

onRetry: () => void;

className?: string;
}

const COPY: Readonly<
Record<
'forbidden' | 'not-found' | 'rate-limit' | 'network' | 'server' | 'unknown',
{ title: string; description: string }
  >
> = Object.freeze({
forbidden: {
title: 'Permission denied',
description:
'Your account no longer has permission to read review reports. Refresh the page or contact an administrator.',
  },
'not-found': {
title: 'Reports not available',
description:
'The review-report endpoint is unavailable. Refresh the page and try again.',
  },
'rate-limit': {
title: 'Too many requests',
description:
'You are sending requests too quickly. Wait a moment and try again.',
  },
network: {
title: 'Connection lost',
description:
'We could not reach the moderation service. Check your connection and try again.',
  },
server: {
title: 'Server error',
description:
'The moderation service is having trouble. Try again in a moment.',
  },
unknown: {
title: 'Could not load reports',
description:
'An unexpected error occurred while loading review reports. Try again.',
  },
});

function classifyErrorCode(code: string | undefined | null): keyof typeof COPY {
if (typeof code !== 'string' || code.length === 0) return 'unknown';
if (code === 'GLOBAL_FORBIDDEN' || code === 'PERMISSION_DENIED') {
return 'forbidden';
  }
if (code === 'REVIEW_NOT_FOUND' || code === 'GLOBAL_NOT_FOUND') {
return 'not-found';
  }
if (code === 'GLOBAL_RATE_LIMITED') return 'rate-limit';
if (
code === 'GLOBAL_NETWORK_ERROR' ||
code === 'GLOBAL_TIMEOUT' ||
code === 'NETWORK_ERROR'
  ) {
return 'network';
  }
if (code === 'GLOBAL_INTERNAL_ERROR' || code.startsWith('GLOBAL_5')) {
return 'server';
  }
return 'unknown';
}

export function ReviewReportErrorState({
error,
onRetry,
className,
}: ReviewReportErrorStateProps): React.ReactElement {
const copyKey = classifyErrorCode(error.code);
const copy = COPY[copyKey];
const code = typeof error.code === 'string' && error.code.length > 0
? error.code
: 'UNKNOWN';

return (
<div
role="alert"
className={[
'flex flex-col items-start gap-3 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900',
className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
data-testid="review-report-error-state"
    >
<div className="flex items-center gap-2">
<AlertCircle className="h-5 w-5" aria-hidden="true" />
<p className="font-semibold">{copy.title}</p>
</div>
<p>{copy.description}</p>
<p className="font-mono text-xs text-red-700">
Error code: <span className="font-semibold">{code}</span>
</p>
<RequestIdBanner error={error} />
<button
type="button"
onClick={onRetry}
className="rounded-md border border-red-400 bg-background px-3 py-1.5 text-sm font-medium text-destructive dark:text-red-400 transition-colors hover:bg-red-100 dark:hover:bg-red-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
data-testid="review-report-error-state-retry"
      >
Try again
      </button>
</div>
  );
}
