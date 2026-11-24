"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { ApiError } from "@/lib/api/core/ApiError";
import { RequestIdBanner } from "@/features/admin/components/RequestIdBanner";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";

import type { RankingJobStatus } from "../ranking-admin-types";

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
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3 rounded-md border border-brand/25 bg-brand/10 dark:bg-brand/15 p-6"
    >
      <div className="flex items-center gap-2">
        <Loader2
          className="h-5 w-5 animate-spin text-brand"
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-foreground">
          Processing…
        </span>
      </div>
      <Skeleton className="h-2 w-full max-w-xs rounded-full bg-brand/20 dark:bg-brand/30" />
    </div>
  );
}

function CompletedState({
  affectedUserCount,
}: {
  affectedUserCount: number | null;
}) {
  return (
    <div
      data-testid="ranking-job-status-completed"
      role="status"
      aria-live="polite"
      className="flex flex-col items-start gap-2 rounded-md border border-success/30 bg-success/10 dark:bg-success/15 p-4"
    >
      <div className="flex items-center gap-2">
        <CheckCircle2
          className="h-5 w-5 text-success"
          aria-hidden="true"
        />
        <Badge variant="outline" className="border-success/30 bg-success/15 text-success font-medium">
          Completed
        </Badge>
      </div>
      <p className="text-sm text-foreground/80">
        {affectedUserCount !== null
          ? `Affected ${affectedUserCount.toLocaleString()} user${affectedUserCount === 1 ? "" : "s"}.`
          : "All eligible users processed."}
      </p>
    </div>
  );
}

function FailedState({
  error,
  requestId,
}: {
  error: ApiError | null;
  requestId?: string;
}) {
  return (
    <div
      data-testid="ranking-job-status-failed"
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 dark:bg-destructive/15 p-4"
    >
      <div className="flex items-center gap-2">
        <XCircle
          className="h-5 w-5 text-destructive"
          aria-hidden="true"
        />
        <Badge variant="destructive">Failed</Badge>
      </div>
      <p className="text-sm text-destructive">
        {error?.detail ?? error?.message ?? "An unexpected error occurred."}
      </p>
      {requestId && error ? <RequestIdBanner error={error} /> : null}
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

  if (jobStatus === "pending" || jobStatus === "running") {
    return <RunningState />;
  }

  if (jobStatus === "completed") {
    return <CompletedState affectedUserCount={affectedUserCount} />;
  }

  if (jobStatus === "failed") {
    return <FailedState error={error} requestId={requestId} />;
  }

  return <IdleState />;
}
