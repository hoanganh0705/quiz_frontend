"use client";

import * as React from "react";

import { QuizHistoryFilterBar } from "./QuizHistoryFilterBar";
import { QuizHistoryList } from "./QuizHistoryList";
import { useAttemptHistoryFilters } from "@/features/attempts/hooks/useAttemptHistoryFilters";

export interface QuizHistoryPageProps {

className?: string;
}

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
