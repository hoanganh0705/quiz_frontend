'use client';

import { AlertCircle } from 'lucide-react';

import { ApiError } from '@/lib/api/core/ApiError';
import { getUserCopy } from '@/lib/api/error-codes';

import { RequestIdBanner } from '@/features/admin/components/RequestIdBanner';

export interface AuditLogErrorStateProps {

error: ApiError | null;

onRetry?: () => void;
}

export function AuditLogErrorState({
error,
onRetry,
}: AuditLogErrorStateProps) {
if (error === null) return null;

const copy = getUserCopy(error.code);

return (
<div
className="space-y-3"
data-testid="audit-log-error-state"
data-error-code={error.code}
    >
<div
className="flex flex-col items-center justify-center rounded-md border border-destructive/40 bg-destructive/5 p-6 text-center"
role="alert"
aria-live="polite"
      >
<AlertCircle
className="mb-2 h-8 w-8 text-destructive/70"
aria-hidden="true"
        />
<p
className="text-sm font-medium text-foreground"
data-testid="audit-log-error-state-title"
        >
{copy.title}
</p>
<p
className="mt-1 text-sm text-muted-foreground"
data-testid="audit-log-error-state-body"
        >
{copy.body}
</p>
{onRetry && (
<button
type="button"
className="mt-4 inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
onClick={onRetry}
data-testid="audit-log-error-state-retry"
          >
Try again
          </button>
        )}
</div>

{/* Shared request-id banner (TKT-7.11.H1). */}
<RequestIdBanner error={error} />
</div>
  );
}