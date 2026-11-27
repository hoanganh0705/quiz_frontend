"use client";

import * as React from "react";

import { RotateCcwIcon, SearchIcon } from "lucide-react";

import { DEFAULT_ATTEMPT_HISTORY_FILTERS } from "@/features/attempts/types/attempt-history.types";

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

import { cn } from "@/shared/utils/merge-class-names";

import type {
  AttemptHistoryDateRange,
  AttemptHistoryFilters,
  AttemptHistoryStatusFilter,
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
    <section
      aria-label="Filter quiz history"
      className={cn(
        "rounded-xl border border-border/70 bg-card/70 p-3.5 sm:p-4",
        className,
      )}
      data-testid="quiz-history-filter-bar"
    >
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:items-end">
        {/* Status dropdown */}
        <div className="flex flex-col gap-1.5 sm:w-44 sm:shrink-0">
          <Label
            htmlFor="quiz-history-filter-status"
            className="text-xs font-medium text-muted-foreground"
          >
            Status
          </Label>
          <Select
            value={filters.status}
            onValueChange={(value) => {
              onFilterChange("status", value as AttemptHistoryStatusFilter);
            }}
          >
            <SelectTrigger
              id="quiz-history-filter-status"
              className="h-10 w-full sm:h-9"
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
        <div className="flex flex-col gap-1.5 sm:w-44 sm:shrink-0">
          <Label
            htmlFor="quiz-history-filter-date"
            className="text-xs font-medium text-muted-foreground"
          >
            Date range
          </Label>
          <Select
            value={filters.dateRange}
            onValueChange={(value) => {
              onFilterChange("dateRange", value as AttemptHistoryDateRange);
            }}
          >
            <SelectTrigger
              id="quiz-history-filter-date"
              className="h-10 w-full sm:h-9"
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
        <div className="col-span-2 flex flex-1 flex-col gap-1.5">
          <Label
            htmlFor="quiz-history-filter-search"
            className="text-xs font-medium text-muted-foreground"
          >
            Search quiz
          </Label>
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="quiz-history-filter-search"
              type="search"
              placeholder="Search quizzes…"
              value={filters.search}
              onChange={(e) => {
                onFilterChange("search", e.target.value);
              }}
              className="h-10 pl-9 sm:h-9 bg-background"
              data-testid="quiz-history-filter-search-input"
            />
          </div>
        </div>

        {/* Reset button */}
        <div className="col-span-2 flex flex-col justify-end sm:col-span-1 sm:shrink-0">
          <Button
            type="button"
            variant="outline"
            disabled={!hasActiveFilters}
            onClick={onReset}
            className="h-10 w-full gap-1.5 sm:h-9 sm:w-auto"
            data-testid="quiz-history-filter-reset"
          >
            <RotateCcwIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Reset
          </Button>
        </div>
      </div>
    </section>
  );
}
