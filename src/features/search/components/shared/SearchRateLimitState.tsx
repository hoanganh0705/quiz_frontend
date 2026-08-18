"use client";

import * as React from "react";

import { Clock, AlertTriangle } from "lucide-react";

import { cn } from "@/shared/utils/merge-class-names";

interface SearchRateLimitStateProps {

retryAfterMs?: number;

onRetry?: () => void;
className?: string;
}

const MIN_DISPLAY_SECONDS = 1;

function formatSeconds(seconds: number): string {
if (seconds <= 0) return "0s";
if (seconds < 60) return `${seconds}s`;
const mins = Math.floor(seconds / 60);
const secs = seconds % 60;
return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function SearchRateLimitState({
retryAfterMs,
onRetry,
className,
}: SearchRateLimitStateProps) {
const [remainingSeconds, setRemainingSeconds] = React.useState<number>(() => {
if (retryAfterMs == null) return -1;
return Math.max(MIN_DISPLAY_SECONDS, Math.ceil(retryAfterMs / 1000));
  });

React.useEffect(() => {
if (retryAfterMs == null) return;

const totalSeconds = Math.max(MIN_DISPLAY_SECONDS, Math.ceil(retryAfterMs / 1000));
setRemainingSeconds(totalSeconds);

if (totalSeconds <= 0) return;

const intervalId = setInterval(() => {
setRemainingSeconds((prev) => {
if (prev <= 1) {
clearInterval(intervalId);
return 0;
        }
return prev - 1;
      });
    }, 1000);

return () => clearInterval(intervalId);
  }, [retryAfterMs]);

const isCounting = retryAfterMs != null && remainingSeconds > 0;
const canRetry = !isCounting;

return (
<div
className={cn(
"flex flex-col items-center justify-center text-center p-6 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
className,
      )}
data-testid="search-rate-limit-state"
role="alert"
aria-live="polite"
    >
{/* Header */}
<div className="flex items-center gap-2 mb-2">
<AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400" />
<span className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
Too many requests
        </span>
</div>

{/* Countdown or generic message */}
{isCounting ? (
<div className="flex flex-col items-center gap-1.5 mb-4">
<Clock className="h-6 w-6 text-amber-400" />
<span className="text-2xl font-mono font-bold text-amber-700 dark:text-amber-300 tabular-nums">
{formatSeconds(remainingSeconds)}
</span>
<span className="text-xs text-amber-600 dark:text-amber-500">
before you can search again
          </span>
</div>
      ) : (
<p className="text-sm text-amber-700 dark:text-amber-400 mb-4">
Please wait a moment before trying again.
        </p>
      )}

{/* Retry button */}
{onRetry && (
<button
type="button"
onClick={onRetry}
disabled={isCounting}
className={cn(
"px-4 py-1.5 text-sm font-medium rounded-md border transition-colors",
isCounting
? "border-amber-300 text-amber-400 cursor-not-allowed opacity-50"
: "border-amber-400 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/30",
          )}
        >
{isCounting ? `Retry in ${formatSeconds(remainingSeconds)}` : "Retry now"}
</button>
      )}
</div>
  );
}
