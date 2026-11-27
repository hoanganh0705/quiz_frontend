"use client";

import * as React from "react";

import { AlertTriangle, Clock } from "lucide-react";

import { useCooldownTimer } from "@/shared/hooks/use-cooldown-timer";
import { formatDurationSeconds } from "@/shared/utils/format-duration";
import { cn } from "@/shared/utils/merge-class-names";

export interface SearchRateLimitStateProps {
  retryAfterMs?: number;
  onRetry?: () => void;
  className?: string;
}

export function SearchRateLimitState({
  retryAfterMs,
  onRetry,
  className,
}: SearchRateLimitStateProps): React.ReactElement {
  const { remainingSeconds, isActive, start, stop } = useCooldownTimer();

  React.useEffect(() => {
    if (retryAfterMs != null && retryAfterMs > 0) {
      start(retryAfterMs);
    } else {
      stop();
    }
  }, [retryAfterMs, start, stop]);

  const isCounting = retryAfterMs != null && isActive;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-6 rounded-xl border border-amber-500/30 bg-amber-500/10",
        className,
      )}
      data-testid="search-rate-limit-state"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle
          className="h-5 w-5 text-amber-500 dark:text-amber-400"
          aria-hidden="true"
        />
        <span className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
          Too many requests
        </span>
      </div>

      {isCounting ? (
        <div className="flex flex-col items-center gap-1.5 mb-4">
          <Clock className="h-6 w-6 text-amber-500" aria-hidden="true" />
          <span className="text-2xl font-mono font-bold text-amber-700 dark:text-amber-300 tabular-nums">
            {formatDurationSeconds(remainingSeconds)}
          </span>
          <span className="text-xs text-amber-700 dark:text-amber-400">
            before you can search again
          </span>
        </div>
      ) : (
        <p className="text-sm text-amber-700 dark:text-amber-400 mb-4">
          Please wait a moment before trying again.
        </p>
      )}

      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={isCounting}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-md border transition-colors",
            isCounting
              ? "border-amber-500/30 text-amber-500/60 cursor-not-allowed opacity-50"
              : "border-amber-500/50 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300",
          )}
        >
          {isCounting
            ? `Retry in ${formatDurationSeconds(remainingSeconds)}`
            : "Retry now"}
        </button>
      ) : null}
    </div>
  );
}
