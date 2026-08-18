'use client';

import { AlertCircle } from 'lucide-react';

import { ApiError } from '@/lib/api/core/ApiError';
import {
getUserCopy,
} from '@/lib/api/error-codes';

export interface AchievementAdminErrorStateProps {

error: ApiError | null;
}

export function AchievementAdminErrorState({
error,
}: AchievementAdminErrorStateProps) {
if (error === null) return null;

const copy = getUserCopy(error.code);
const hasRequestId = Boolean(error.requestId);

return (
<div
className="flex flex-col items-center justify-center rounded-md border border-destructive/40 bg-destructive/5 p-6 text-center"
role="alert"
aria-live="polite"
data-testid="achievement-admin-error-state"
data-error-code={error.code}
    >
<AlertCircle
className="mb-2 h-8 w-8 text-destructive/70"
aria-hidden="true"
      />
<p
className="text-sm text-muted-foreground"
data-testid="achievement-admin-error-state-copy"
      >
{copy.body}
</p>
{hasRequestId && (
<p
className="mt-2 font-mono text-xs text-muted-foreground/60"
data-testid="achievement-admin-error-state-request-id"
        >
Request ID: {error.requestId}
</p>
      )}
</div>
  );
}
