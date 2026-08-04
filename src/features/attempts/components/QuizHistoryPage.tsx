"use client";

/**
 * `QuizHistoryPage` — live quiz history page composition.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.20.
 *
 * ## What this component owns
 *
 *   - Composes the filter bar and the history list.
 *   - Wires the filter bar to the URL-sync hook the list consumes.
 *   - Renders the page header without exposing private user data
 *     (the page title is generic; no username or attempt count is
 *     surfaced in the heading).
 *
 * ## What this component does NOT own
 *
 *   - No service, store, or state-machine imports beyond the
 *     documented hook imports.
 *   - No mock data imports.
 *
 * The page is the live replacement for the Phase 3 mock at
 * `src/app/(protected)/quiz-history/page.tsx` (T-4.15.23).
 */

import * as React from "react";

import { QuizHistoryFilterBar } from "./QuizHistoryFilterBar";
import { QuizHistoryList } from "./QuizHistoryList";
import { useAttemptHistoryFilters } from "@/features/attempts/hooks/useAttemptHistoryFilters";

// ─── Public types ────────────────────────────────────────────────────────────

export interface QuizHistoryPageProps {
  /** Optional class name applied to the page root. */
  className?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function QuizHistoryPage(
  props: QuizHistoryPageProps,
): React.ReactElement {
  const { className } = props;
  const { filters, setFilter, resetFilters } = useAttemptHistoryFilters();

  return (
    <div
      className={className}
      data-testid="quiz-history-page"
    >
      {/* Page header */}
      <div className="mb-6 space-y-1">
        <h1
          className="text-2xl font-bold text-foreground"
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
      </div>

      {/* Filter bar */}
      <QuizHistoryFilterBar
        filters={filters}
        onFilterChange={setFilter}
        onReset={resetFilters}
        className="mb-6"
      />

      {/* Paginated list */}
      <QuizHistoryList filters={filters} />
    </div>
  );
}
