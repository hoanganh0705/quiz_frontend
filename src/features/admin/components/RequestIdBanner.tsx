'use client';

import { AlertCircle } from 'lucide-react';

import { cn } from '@/shared/utils/merge-class-names';
import { ApiError } from '@/lib/api/core/ApiError';

export interface RequestIdBannerProps {
error: ApiError | null;
}

export function RequestIdBanner({ error }: RequestIdBannerProps) {
if (error === null) {
return null;
  }

const requestId = error.requestId;

const extensions =
(error as unknown as {
data?: { extensions?: { correlationId?: string } };
    }).data?.extensions;
const hasExplicitCorrelationId =
typeof extensions?.correlationId === 'string';

if (!requestId) {
return null;
  }
const correlationId = error.correlationId;

return (
<div
role="alert"
aria-live="polite"
data-testid="admin-request-id-banner"
className={cn(
'flex w-full items-start gap-3 rounded-md border',
'border-destructive/30 bg-destructive/5 px-4 py-3',
'text-sm text-destructive',
      )}
    >
<AlertCircle
className="mt-0.5 h-4 w-4 flex-shrink-0"
aria-hidden="true"
      />
<div className="flex flex-col gap-1">
<span className="font-semibold">Action failed</span>
<span data-testid="admin-request-id-banner-request-id">
Request ID:{' '}
<span className="font-mono text-xs">{requestId}</span>
</span>
{correlationId && hasExplicitCorrelationId ? (
<span data-testid="admin-request-id-banner-correlation-id">
Correlation ID:{' '}
<span className="font-mono text-xs">{correlationId}</span>
</span>
        ) : null}
</div>
</div>
  );
}
