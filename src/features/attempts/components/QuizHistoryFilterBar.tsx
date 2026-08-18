"use client";

import * as React from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/Select";
import { RotateCcwIcon } from "lucide-react";
import { cn } from "@/shared/utils/merge-class-names";

import {
DEFAULT_ATTEMPT_HISTORY_FILTERS,
type AttemptHistoryDateRange,
type AttemptHistoryFilters,
type AttemptHistoryStatusFilter,
} from "@/features/attempts/types/attempt-history.types";

export interface QuizHistoryFilterBarProps {

filters: AttemptHistoryFilters;

onFilterChange: <K extends keyof AttemptHistoryFilters>(
key: K,
value: AttemptHistoryFilters[K],
  ) => void;

onReset: () => void;

className?: string;
}

const STATUS_OPTIONS: Array<{
value: AttemptHistoryStatusFilter;
label: string;
}> = [
{ value: "all", label: "All statuses" },
{ value: "completed", label: "Completed" },
{ value: "abandoned", label: "Abandoned" },
{ value: "started", label: "In progress" },
];

const DATE_OPTIONS: Array<{
value: AttemptHistoryDateRange;
label: string;
}> = [
{ value: "all", label: "All time" },
{ value: "last_7_days", label: "Last 7 days" },
{ value: "last_30_days", label: "Last 30 days" },
{ value: "last_90_days", label: "Last 90 days" },
];

export function QuizHistoryFilterBar(
props: QuizHistoryFilterBarProps,
): React.ReactElement {
const { filters, onFilterChange, onReset, className } = props;

const hasActiveFilters =
filters.status !== DEFAULT_ATTEMPT_HISTORY_FILTERS.status ||
filters.dateRange !== DEFAULT_ATTEMPT_HISTORY_FILTERS.dateRange ||
filters.search.trim().length > 0;

return (
<div
className={cn(
"flex flex-col gap-4 sm:flex-row sm:items-end",
className,
      )}
data-testid="quiz-history-filter-bar"
    >
{/* Status dropdown */}
<div className="flex flex-col gap-1.5 sm:min-w-40">
<Label htmlFor="quiz-history-filter-status">Status</Label>
<Select
value={filters.status}
onValueChange={(value) => {
onFilterChange("status", value as AttemptHistoryStatusFilter);
          }}
        >
<SelectTrigger
id="quiz-history-filter-status"
data-testid="quiz-history-filter-status-trigger"
          >
<SelectValue />
</SelectTrigger>
<SelectContent>
{STATUS_OPTIONS.map((opt) => (
<SelectItem key={opt.value} value={opt.value}>
{opt.label}
</SelectItem>
            ))}
</SelectContent>
</Select>
</div>

{/* Date range dropdown */}
<div className="flex flex-col gap-1.5 sm:min-w-40">
<Label htmlFor="quiz-history-filter-date">Date range</Label>
<Select
value={filters.dateRange}
onValueChange={(value) => {
onFilterChange("dateRange", value as AttemptHistoryDateRange);
          }}
        >
<SelectTrigger
id="quiz-history-filter-date"
data-testid="quiz-history-filter-date-trigger"
          >
<SelectValue />
</SelectTrigger>
<SelectContent>
{DATE_OPTIONS.map((opt) => (
<SelectItem key={opt.value} value={opt.value}>
{opt.label}
</SelectItem>
            ))}
</SelectContent>
</Select>
</div>

{/* Search input */}
<div className="flex flex-1 flex-col gap-1.5">
<Label htmlFor="quiz-history-filter-search">Search quiz</Label>
<Input
id="quiz-history-filter-search"
type="search"
placeholder="Search quizzes…"
value={filters.search}
onChange={(e) => {
onFilterChange("search", e.target.value);
          }}
data-testid="quiz-history-filter-search-input"
        />
</div>

{/* Reset button */}
<div className="flex flex-col justify-end">
<Button
type="button"
variant="ghost"
size="sm"
disabled={!hasActiveFilters}
onClick={onReset}
className="gap-1.5"
data-testid="quiz-history-filter-reset"
        >
<RotateCcwIcon className="h-3.5 w-3.5" aria-hidden />
Reset
        </Button>
</div>
</div>
  );
}
