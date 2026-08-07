'use client';

/**
 * `features/admin/ranking-admin/components/ConsistencyCheckPanel.tsx`
 *
 * Source epic:   Epic 7.9 — Ranking Admin: Recalculate, Consistency Check, Period Reset.
 * Source ticket: TKT-7.9.E3.
 *
 * ## What this component owns
 *
 * The "Consistency Check" panel: a "Run Consistency Check" trigger button,
 * a `<RankingJobStatusPanel>`, a `<RankingInconsistencyTable>` for the result,
 * and the `<RequestIdBanner>` on failure. No typed-confirm is required.
 *
 * The panel preserves its previous state during mutation — a request
 * error does not clear the previous result.
 */

import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { CheckCircle2, Info } from 'lucide-react';
import { RequestIdBanner } from '@/features/admin/components/RequestIdBanner';

import { useCheckRankingConsistency } from '../hooks/useCheckRankingConsistency';

import { RankingInconsistencyTable } from './RankingInconsistencyTable';
import { RankingJobStatusPanel } from './RankingJobStatusPanel';

/**
 * Panel for triggering a ranking consistency check.
 */
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
    <Card data-testid="consistency-check-panel">
      <CardHeader>
        <CardTitle>Consistency Check</CardTitle>
        <CardDescription>
          Run a read-only consistency check on the ranking data.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Trigger button */}
        <Button
          data-testid="consistency-check-trigger-button"
          onClick={handleTrigger}
          disabled={isRunning}
        >
          {isRunning ? 'Running…' : 'Run Consistency Check'}
        </Button>

        {/* Partial result notice */}
        {isPartialResult && totalCount !== null && totalCount > 0 ? (
          <div
            data-testid="consistency-check-partial-notice"
            role="status"
            className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
          >
            <Info
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <span>
              The check returned a summary only — {totalCount.toLocaleString()}{' '}
              issue{totalCount === 1 ? '' : 's'} detected. Per-item details are
              not available at this commit.
            </span>
          </div>
        ) : null}

        {/* Loading skeleton */}
        {isRunning ? (
          <div
            data-testid="consistency-check-skeleton"
            className="flex flex-col gap-2"
          >
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : null}

        {/* Job status */}
        <RankingJobStatusPanel
          jobStatus={isRunning || hasTriggered ? 'completed' : null}
          affectedUserCount={null}
          error={error}
          requestId={error?.requestId}
        />

        {/* Empty state — zero inconsistencies */}
        {!isRunning && hasTriggered && totalCount === 0 && !error ? (
          <div
            data-testid="consistency-check-empty-state"
            role="status"
            className="flex items-start gap-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
          >
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <span>
              No inconsistencies found. Rankings are consistent.
            </span>
          </div>
        ) : null}

        {/* Inconsistency table */}
        {!isRunning && hasTriggered && inconsistencies.length > 0 ? (
          <RankingInconsistencyTable
            inconsistencies={inconsistencies}
            isLoading={false}
          />
        ) : null}

        {/* Reset button — only after a check has run */}
        {!isRunning && hasTriggered && checkedAt !== null ? (
          <Button
            variant="outline"
            data-testid="consistency-check-reset-button"
            onClick={handleReset}
          >
            Reset
          </Button>
        ) : null}

        {/* Request ID banner on error */}
        {error ? <RequestIdBanner error={error} /> : null}
      </CardContent>
    </Card>
  );
}
