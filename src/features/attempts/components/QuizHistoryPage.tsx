"use client";

import * as React from "react";

import { useAttemptHistoryFilters } from "@/features/attempts/hooks/useAttemptHistoryFilters";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";
import { cn } from "@/shared/utils/merge-class-names";

import { QuizHistoryFilterBar } from "./QuizHistoryFilterBar";
import { QuizHistoryList } from "./QuizHistoryList";

export interface QuizHistoryPageProps {
  className?: string;
}

export function QuizHistoryPage(
  props: QuizHistoryPageProps,
): React.ReactElement {
  const { className } = props;
  const { filters, setFilter, resetFilters } = useAttemptHistoryFilters();

  return (
    <main
      className={cn("@container", PAGE_CONTAINER_CLASS, className)}
      data-testid="quiz-history-page"
    >
      <div className="space-y-6">
        <header className="space-y-1.5 border-b border-border/70 pb-5">
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
            data-testid="quiz-history-page-heading"
          >
            Your quiz history
          </h1>
          <p
            className="text-sm text-muted-foreground"
            data-testid="quiz-history-page-subheading"
          >
            Review your past quiz attempts, scores, and progress.
          </p>
        </header>

        <QuizHistoryFilterBar
          filters={filters}
          onFilterChange={setFilter}
          onReset={resetFilters}
        />

        <QuizHistoryList filters={filters} onResetFilters={resetFilters} />
      </div>
    </main>
  );
}
