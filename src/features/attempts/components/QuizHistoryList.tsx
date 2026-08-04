"use client";

/**
 * `QuizHistoryList` — paginated attempt history list composition.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.19.
 *
 * ## What this component owns
 *
 *   - Composes the paginated history rows (`QuizHistoryRow`),
 *     the load-more affordance, the empty-state CTA, and the skeleton
 *     loading surface.
 *   - Skeleton: renders 10 placeholder rows while the first fetch
 *     is in flight.
 *   - Empty state: renders an `EmptyState` CTA when the paginated
 *     list is empty (first page resolved to no results).
 *   - Load-more: renders a "Load more" button when `hasMore` is
 *     true. Disables while `isLoadingMore`.
 *   - Retry affordance: renders a "Retry" link when the most recent
 *     fetch failed with a 5xx error.
 *
 * ## What this component does NOT own
 *
 *   - No service, store, or router imports beyond the documented
 *     hook import.
 *
 * The list is composed by `QuizHistoryPage` (T-4.15.20).
 */

import * as React from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ClipboardListIcon, RefreshCwIcon } from "lucide-react";
import { cn } from "@/shared/utils/merge-class-names";

import { useMyAttemptsWithFilters } from "@/features/attempts/hooks/useMyAttemptsWithFilters";
import type { AttemptHistoryFilters } from "@/features/attempts/types/attempt-history.types";
import { QuizHistoryRow } from "./QuizHistoryRow";

// ─── Public types ────────────────────────────────────────────────────────────

export interface QuizHistoryListProps {
  /**
   * Filter state consumed by `useMyAttemptsWithFilters`.
   * The parent owns the filter state and URL sync; this component
   * only reads from the hook.
   */
  filters: AttemptHistoryFilters;
  /** Optional class name applied to the list root. */
  className?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function QuizHistoryList(
  props: QuizHistoryListProps,
): React.ReactElement {
  const { filters, className } = props;

  const {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    refresh,
    error,
  } = useMyAttemptsWithFilters({ filters });

  // ─── Loading skeleton ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <ul
        className={cn("space-y-3", className)}
        data-testid="quiz-history-list-skeleton"
        aria-label="Loading attempts…"
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </ul>
    );
  }

  // ─── 5xx retry affordance ──────────────────────────────────────────
  if (error !== null && items.length === 0) {
    return (
      <div
        className={cn("rounded-lg border border-border bg-card p-6", className)}
        data-testid="quiz-history-list-error"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-medium">Failed to load attempts</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void refresh();
            }}
            data-testid="quiz-history-list-retry"
          >
            <RefreshCwIcon className="mr-2 h-4 w-4" aria-hidden />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // ─── Empty state ───────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className={className} data-testid="quiz-history-list-empty">
        <EmptyState
          icon={ClipboardListIcon}
          title="No attempts yet"
          description="You haven't completed any quizzes yet. Start a quiz to see your history here."
          actions={[
            {
              label: "Browse quizzes",
              href: "/quizzes",
            },
          ]}
        />
      </div>
    );
  }

  // ─── List + load-more ──────────────────────────────────────────────
  return (
    <div className={cn("space-y-3", className)} data-testid="quiz-history-list">
      <ul className="space-y-3" aria-label="Your quiz attempts">
        {items.map((row) => (
          <QuizHistoryRow key={row.id} row={row} />
        ))}
      </ul>

      {hasMore ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={isLoadingMore}
            onClick={() => {
              void loadMore();
            }}
            data-testid="quiz-history-list-load-more"
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
