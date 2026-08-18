"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

import {
getFollowErrorMessage,
isFollowErrorRetryable,
type FollowErrorCode,
} from "@/features/social/components/follow-error-copy";

export interface FollowErrorBannerProps {

error: FollowErrorCode | null;

onRetry?: () => void;
}

export function FollowErrorBanner({
error,
onRetry,
}: FollowErrorBannerProps) {
if (error === null) {
return null;
  }

const message = getFollowErrorMessage(error);
const retryable = isFollowErrorRetryable(error);

return (
<div
role="alert"
aria-live="polite"
className="mt-2 flex items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm"
    >
{/* Icon + message */}
<span className="flex items-center gap-2 text-destructive">
<AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
{message}
</span>

{/* Retry button — only for transient errors */}
{retryable && onRetry && (
<button
type="button"
onClick={onRetry}
className="shrink-0 rounded border border-destructive/40 bg-background px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
aria-label="Retry"
        >
<RefreshCw className="mr-1 inline-block h-3 w-3" aria-hidden="true" />
Retry
        </button>
      )}
</div>
  );
}
