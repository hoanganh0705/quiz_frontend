"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Search, RotateCcwIcon, X } from "lucide-react";
import { cn } from "@/shared/utils/merge-class-names";

import type {
  TournamentListFilters,
  TournamentStatus,
} from "@/features/tournaments/types";

export interface TournamentFiltersProps {
  filters: TournamentListFilters;
  onFilterChange: <K extends keyof TournamentListFilters>(
    key: K,
    value: TournamentListFilters[K],
  ) => void;
  onReset: () => void;
  className?: string;
}

const STATUS_TABS: ReadonlyArray<{
  readonly value: TournamentStatus | undefined;
  readonly label: string;
}> = [
  { value: undefined, label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "registration", label: "Registration Open" },
  { value: "ongoing", label: "Active" },
  { value: "finished", label: "Completed" },
];

export function TournamentFilters({
  filters,
  onFilterChange,
  onReset,
  className,
}: TournamentFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setSearchValue(filters.search);
  }, [filters.search]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value);

      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onFilterChange("search", value);
      }, 300);
    },
    [onFilterChange],
  );

  const handleClearSearch = useCallback(() => {
    setSearchValue("");
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    onFilterChange("search", "");
  }, [onFilterChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const nextIndex = (index + 1) % STATUS_TABS.length;
        onFilterChange("status", STATUS_TABS[nextIndex].value);
        tabRefs.current[nextIndex]?.focus();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prevIndex = (index - 1 + STATUS_TABS.length) % STATUS_TABS.length;
        onFilterChange("status", STATUS_TABS[prevIndex].value);
        tabRefs.current[prevIndex]?.focus();
      }
    },
    [onFilterChange],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const hasActiveFilters =
    filters.status !== undefined || filters.search.trim().length > 0;

  return (
    <div
      className={cn("flex flex-col gap-4 sm:flex-row sm:items-end", className)}
    >
      {/* Status tabs — wrapped in fieldset/legend for screen reader grouping */}
      <fieldset className="flex flex-col gap-1.5 shrink-0">
        <legend className="sr-only">Filter by status</legend>
        <Label>Status</Label>
        <div
          role="tablist"
          aria-label="Tournament status"
          className="flex h-9 items-center rounded-md border bg-background p-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {STATUS_TABS.map((tab, index) => {
            const isActive = filters.status === tab.value;
            return (
              <button
                key={tab.label}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="tournament-list-panel"
                aria-label={`Show ${tab.label} tournaments`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onFilterChange("status", tab.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={cn(
                  "inline-flex h-full items-center justify-center shrink-0 whitespace-nowrap px-3 text-sm font-medium rounded-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Search input — wrapped in fieldset for semantic grouping */}
      <fieldset className="flex flex-1 flex-col gap-1.5 min-w-0 sm:min-w-[200px]">
        <legend className="sr-only">Search tournaments</legend>
        <Label htmlFor="tournament-search">Search</Label>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="tournament-search"
            type="search"
            placeholder="Search tournaments..."
            value={searchValue}
            onChange={handleSearchChange}
            onKeyDown={(e) => {
              if (e.key === "Escape" && searchValue) {
                e.preventDefault();
                handleClearSearch();
              }
            }}
            className="pl-9 pr-9 bg-background h-9"
          />
          {searchValue.length > 0 && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </fieldset>

      {/* Reset button */}
      <div className="flex flex-col justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!hasActiveFilters}
          onClick={onReset}
          className="gap-1.5 h-9"
        >
          <RotateCcwIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Reset
        </Button>
      </div>
    </div>
  );
}
