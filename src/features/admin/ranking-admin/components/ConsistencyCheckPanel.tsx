"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, Info, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { RequestIdBanner } from "@/features/admin/components/RequestIdBanner";

import { useCheckRankingConsistency } from "../hooks/useCheckRankingConsistency";

import { RankingInconsistencyTable } from "./RankingInconsistencyTable";
import { RankingJobStatusPanel } from "./RankingJobStatusPanel";

export function ConsistencyCheckPanel(): React.ReactElement {
  const [hasTriggered, setHasTriggered] = useState(false);

  const {
    trigger,
    inconsistencies,
    totalCount,
    checkedAt,
    error,
    isRunning,
    isPartialResult,
    reset,
  } = useCheckRankingConsistency();

  const handleTrigger = useCallback(async () => {
    setHasTriggered(true);
    try {
      await trigger();
    } catch {
      // Error is captured via the hook's `error` state.
    }
  }, [trigger]);

  const handleReset = useCallback(() => {
    setHasTriggered(false);
    reset();
  }, [reset]);

  return (
    <Card data-testid="consistency-check-panel" className="border-border">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex aspect-square size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <CardTitle
              role="heading"
              aria-level={2}
              className="text-base font-semibold"
            >
              Consistency & Data Integrity
            </CardTitle>
            <CardDescription>
              Execute a read-only scan across all user scores to identify leaderboard desynchronizations.
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isRunning && hasTriggered && checkedAt !== null ? (
            <Button
              variant="outline"
              size="sm"
              data-testid="consistency-check-reset-button"
              onClick={handleReset}
            >
              Clear Results
            </Button>
          ) : null}
          <Button
            size="sm"
            data-testid="consistency-check-trigger-button"
            onClick={handleTrigger}
            disabled={isRunning}
            className="gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                <span>Scanning…</span>
              </>
            ) : (
              <span>Run Consistency Check</span>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Partial result notice */}
        {isPartialResult && totalCount !== null && totalCount > 0 ? (
          <div
            data-testid="consistency-check-partial-notice"
            role="status"
            className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 dark:bg-warning/15 p-3 text-sm text-foreground"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <span>
              The check returned a summary only — {totalCount.toLocaleString()}{" "}
              issue{totalCount === 1 ? "" : "s"} detected. Per-item details are
              not available at this commit.
            </span>
          </div>
        ) : null}

        {/* Loading skeleton */}
        {isRunning ? (
          <div
            data-testid="consistency-check-skeleton"
            className="flex flex-col gap-2.5 py-2"
          >
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : null}

        {/* Job status on error */}
        {error ? (
          <RankingJobStatusPanel
            jobStatus="failed"
            affectedUserCount={null}
            error={error}
            requestId={error?.requestId}
          />
        ) : null}

        {/* Empty state — zero inconsistencies */}
        {!isRunning && hasTriggered && totalCount === 0 && !error ? (
          <div
            data-testid="consistency-check-empty-state"
            role="status"
            className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 dark:bg-success/15 p-4 text-sm text-foreground"
          >
            <CheckCircle2
              className="mt-0.5 size-5 shrink-0 text-success"
              aria-hidden="true"
            />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-success">
                Rankings are fully consistent
              </span>
              <span className="text-xs text-muted-foreground">
                No discrepancies found between individual attempt scores and leaderboard rankings.
                {checkedAt
                  ? ` Verified at ${checkedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}.`
                  : ""}
              </span>
            </div>
          </div>
        ) : null}

        {/* Inconsistency table */}
        {!isRunning && hasTriggered && inconsistencies.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
              <span>
                Found <strong className="text-foreground">{totalCount ?? inconsistencies.length}</strong> {totalCount === 1 ? "issue" : "issues"} during scan
              </span>
              {checkedAt && (
                <span>
                  Scanned at {checkedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              )}
            </div>
            <RankingInconsistencyTable
              inconsistencies={inconsistencies}
              isLoading={false}
            />
          </div>
        ) : null}

        {/* Initial Idle prompt when not yet triggered */}
        {!isRunning && !hasTriggered ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            <span>No scan currently in progress. Click &quot;Run Consistency Check&quot; to inspect current ranking tables.</span>
            <span className="text-xs text-muted-foreground/75 shrink-0">Read-only • Safe anytime</span>
          </div>
        ) : null}

        {/* Request ID banner on error */}
        {error ? <RequestIdBanner error={error} /> : null}
      </CardContent>
    </Card>
  );
}
