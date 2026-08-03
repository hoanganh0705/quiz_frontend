/**
 * `BulkQuestionResultList` — specialized bulk result display for question operations.
 *
 * Source epic:   Epic 4.10 — Question editor (single + bulk).
 * Source ticket: T-4.10.19.
 *
 * ## What this component owns
 *
 * - Displays per-item results from bulk question creation.
 * - Shows success/failure status with icons.
 * - Provides edit-and-retry action for failed rows.
 * - Provides view action for successful rows.
 *
 * ## Reuses
 *
 * Based on the pattern from `BulkResultList` in Epic 4.7 (bookmarks).
 * This version is specialized for question creation results.
 *
 * @see `BulkResultList` — the original component pattern
 */

'use client';

import { memo, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Eye,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { cn } from '@/shared/utils/merge-class-names';

import type { BulkQuestionResultItem } from '@/features/quizzes/types/author-dtos';

// ─── Props ─────────────────────────────────────────────────────────────────

export interface BulkQuestionResultListProps {
  /** Per-item results from bulk question creation. */
  results: BulkQuestionResultItem[];
  /** Labels for each row (optional). */
  labels?: Record<number, string>;
  /** Callback when retry is clicked for a failed row. */
  onRetry?: (index: number) => void;
  /** Callback when view is clicked for a successful row. */
  onView?: (questionId: string, index: number) => void;
  /** Callback when dismiss is clicked. */
  onDismiss?: (index: number) => void;
  /** Whether retry is in progress. */
  isRetrying?: boolean;
}

// ─── Summary counts ────────────────────────────────────────────────────────

function getSummaryCounts(results: BulkQuestionResultItem[]): {
  total: number;
  succeeded: number;
  failed: number;
} {
  const succeeded = results.filter((r) => r.status === 201).length;
  const failed = results.filter((r) => r.status !== 201).length;
  return { total: results.length, succeeded, failed };
}

// ─── Result row component ───────────────────────────────────────────────────

interface ResultRowProps {
  result: BulkQuestionResultItem;
  label?: string;
  onRetry?: (index: number) => void;
  onView?: (questionId: string, index: number) => void;
  onDismiss?: (index: number) => void;
  isRetrying?: boolean;
}

function ResultRow({
  result,
  label,
  onRetry,
  onView,
  onDismiss,
  isRetrying,
}: ResultRowProps): React.ReactElement {
  const isSuccess = result.status === 201;

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3',
        isSuccess
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-red-500/30 bg-red-500/5',
      )}
      data-testid={`bulk-question-result-${result.index}`}
    >
      {/* Status icon */}
      {isSuccess ? (
        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
      ) : (
        <XCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm font-medium',
            isSuccess ? 'text-green-700' : 'text-red-700',
          )}
        >
          {label ?? `Question ${result.index + 1}`}
        </p>
        <p className="text-xs text-muted-foreground">
          {isSuccess
            ? result.questionId
              ? `ID: ${result.questionId.slice(0, 8)}...`
              : 'Created successfully'
            : result.message || `Failed (${result.code})`}
        </p>
        {!isSuccess && result.code && (
          <p className="text-xs text-red-500">Code: {result.code}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isSuccess && onView && result.questionId && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => onView(result.questionId!, result.index)}
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </Button>
        )}
        {!isSuccess && onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => onRetry(result.index)}
            disabled={isRetrying}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </Button>
        )}
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground hover:text-foreground"
            onClick={() => onDismiss(result.index)}
          >
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * `<BulkQuestionResultList />` — displays per-item bulk question creation results.
 */
export const BulkQuestionResultList = memo(function BulkQuestionResultList({
  results,
  labels = {},
  onRetry,
  onView,
  onDismiss,
  isRetrying = false,
}: BulkQuestionResultListProps): React.ReactElement | null {
  if (results.length === 0) {
    return null;
  }

  const summary = getSummaryCounts(results);

  // Group results by status
  const successResults = results.filter((r) => r.status === 201);
  const failedResults = results.filter((r) => r.status !== 201);

  return (
    <div className="space-y-4" data-testid="bulk-question-result-list">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-green-600">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {summary.succeeded} created
          </span>
          {summary.failed > 0 && (
            <span className="flex items-center gap-1.5 text-red-600">
              <XCircle className="h-4 w-4" aria-hidden="true" />
              {summary.failed} failed
            </span>
          )}
        </div>

        {/* Retry all failed */}
        {failedResults.length > 0 && onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              failedResults.forEach((r) => onRetry?.(r.index));
            }}
            disabled={isRetrying}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry all failed
          </Button>
        )}
      </div>

      {/* Results list */}
      <ScrollArea className="h-80 rounded-md border">
        <div className="space-y-2 p-3">
          {results.map((result) => (
            <ResultRow
              key={result.index}
              result={result}
              label={labels[result.index]}
              onRetry={onRetry}
              onView={onView}
              onDismiss={onDismiss}
              isRetrying={isRetrying}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
});
