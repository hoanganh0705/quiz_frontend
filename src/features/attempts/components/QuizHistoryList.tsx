"use client";

import * as React from "react";

import {
  AlertCircleIcon,
  ClipboardListIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SearchXIcon,
} from "lucide-react";

import { useMyAttemptsWithFilters } from "@/features/attempts/hooks/useMyAttemptsWithFilters";
import { DEFAULT_ATTEMPT_HISTORY_FILTERS } from "@/features/attempts/types/attempt-history.types";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

import { cn } from "@/shared/utils/merge-class-names";

import { QuizHistoryRow } from "./QuizHistoryRow";

import type { AttemptHistoryFilters } from "@/features/attempts/types/attempt-history.types";

export interface QuizHistoryListProps {
  filters: AttemptHistoryFilters;

  onResetFilters?: () => void;

  className?: string;
}

export function QuizHistoryList(
  props: QuizHistoryListProps,
): React.ReactElement {
  const { filters, onResetFilters, className } = props;

  const { items, isLoading, isLoadingMore, hasMore, loadMore, refresh, error } =
    useMyAttemptsWithFilters({ filters });

  const hasActiveFilters =
    filters.status !== DEFAULT_ATTEMPT_HISTORY_FILTERS.status ||
    filters.dateRange !== DEFAULT_ATTEMPT_HISTORY_FILTERS.dateRange ||
    filters.search.trim().length > 0;

  if (isLoading) {
    return (
      <ul
        className={cn("space-y-3 list-none", className)}
        data-testid="quiz-history-list-skeleton"
        aria-label="Loading attempts…"
        aria-busy="true"
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <li key={i} aria-hidden="true">
            <Skeleton className="h-16 w-full rounded-xl" />
          </li>
        ))}
      </ul>
    );
  }

  if (error !== null && items.length === 0) {
    return (
      <div
        role="alert"
        className={cn(
          "rounded-xl border border-destructive/30 bg-card p-6 sm:p-8",
          className,
        )}
        data-testid="quiz-history-list-error"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircleIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Failed to load attempts
            </p>
            <p className="text-xs text-muted-foreground">
              Something went wrong while fetching your quiz history. Try again
              in a moment.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-1 h-10 sm:h-9"
            onClick={() => {
              void refresh();
            }}
            data-testid="quiz-history-list-retry"
          >
            <RefreshCwIcon className="h-4 w-4" aria-hidden="true" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    if (hasActiveFilters) {
      return (
        <div
          className={cn(
            "rounded-xl border border-border/70 bg-card/60",
            className,
          )}
          data-testid="quiz-history-list-empty"
        >
          <EmptyState
            icon={SearchXIcon}
            headingLevel="h2"
            title="No matching attempts"
            description="No quiz attempts match your current filters. Try adjusting or clearing them to see your full history."
            actions={
              onResetFilters
                ? [
                    {
                      label: "Reset filters",
                      onClick: onResetFilters,
                      icon: RotateCcwIcon,
                    },
                    {
                      label: "Browse quizzes",
                      href: "/quizzes",
                      variant: "outline",
                    },
                  ]
                : [
                    {
                      label: "Browse quizzes",
                      href: "/quizzes",
                    },
                  ]
            }
          />
        </div>
      );
    }

    return (
      <div
        className={cn(
          "rounded-xl border border-border/70 bg-card/60",
          className,
        )}
        data-testid="quiz-history-list-empty"
      >
        <EmptyState
          icon={ClipboardListIcon}
          headingLevel="h2"
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

  return (
    <div className={cn("space-y-4", className)} data-testid="quiz-history-list">
      <ul
        className="overflow-hidden rounded-xl border border-border/70 bg-card divide-y divide-border/60 shadow-2xs list-none"
        aria-label="Your quiz attempts"
      >
        {items.map((row) => (
          <QuizHistoryRow key={row.id} row={row} />
        ))}
      </ul>

      {error !== null ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
          data-testid="quiz-history-list-load-more-error"
        >
          <span className="text-foreground">
            Could not load more attempts. Try again.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => {
              void loadMore();
            }}
          >
            <RefreshCwIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Try again
          </Button>
        </div>
      ) : null}

      {hasMore ? (
        <div className="flex justify-center pt-1">
          <Button
            type="button"
            variant="outline"
            disabled={isLoadingMore}
            className="h-10 px-6 sm:h-9"
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
