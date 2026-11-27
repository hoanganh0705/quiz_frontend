"use client";

import { memo, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Progress } from "@/components/ui/Progress";
import { cn } from "@/shared/utils/merge-class-names";

export interface PublishReadinessCounterProps {
  current: number;

  required: number;

  isReady: boolean;
}

const ProgressBar = memo(function ProgressBar({
  progress,
  isReady,
}: {
  progress: number;
  isReady: boolean;
}): React.ReactElement {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);
    return () => clearTimeout(timeout);
  }, [progress]);

  const clamped = Math.min(100, Math.max(0, animatedProgress));

  return (
    <Progress
      value={clamped}
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "h-2 w-full bg-secondary",
        isReady
          ? "[&_[data-slot=progress-indicator]]:bg-success"
          : "[&_[data-slot=progress-indicator]]:bg-warning",
      )}
    />
  );
});

export const PublishReadinessCounter = memo(function PublishReadinessCounter({
  current,
  required,
  isReady,
}: PublishReadinessCounterProps): React.ReactElement {
  const progress = Math.min(100, (current / required) * 100);

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border p-4 transition-colors",
        isReady
          ? "border-success/40 bg-success/10"
          : "border-warning/40 bg-warning/10",
      )}
      data-testid="publish-readiness-counter"
      role="status"
      aria-live="polite"
    >
      {/* Icon */}
      {isReady ? (
        <CheckCircle2 className="h-8 w-8 shrink-0 text-success" />
      ) : (
        <AlertCircle className="h-8 w-8 shrink-0 text-warning" />
      )}

      {/* Content */}
      <div className="flex-1 space-y-2">
        <div className="flex items-baseline justify-between">
          <span
            className={cn(
              "text-lg font-semibold font-mono tabular-nums",
              isReady ? "text-success" : "text-foreground",
            )}
          >
            {current} / {required} questions
          </span>
          <span
            className={cn(
              "text-sm",
              isReady ? "text-success" : "text-muted-foreground",
            )}
          >
            {isReady ? "Ready to publish" : `${required - current} more needed`}
          </span>
        </div>
        <ProgressBar progress={progress} isReady={isReady} />
      </div>
    </div>
  );
});
