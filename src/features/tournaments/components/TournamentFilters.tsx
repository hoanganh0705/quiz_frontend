"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Search, RotateCcwIcon } from "lucide-react";
import { cn } from "@/shared/utils/merge-class-names";

import type { TournamentListFilters, TournamentStatus } from "@/features/tournaments/types";

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
<div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end", className)}>
{/* Status tabs */}
<div className="flex flex-col gap-1.5">
<Label>Status</Label>
<div className="flex rounded-md border bg-background p-1 gap-1">
{STATUS_TABS.map((tab) => {
const isActive = filters.status === tab.value;
return (
<button
key={tab.label}
type="button"
onClick={() => onFilterChange("status", tab.value)}
className={cn(
"flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
isActive
? "bg-primary text-primary-foreground shadow-sm"
: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
aria-pressed={isActive}
              >
{tab.label}
</button>
            );
          })}
</div>
</div>

{/* Search input */}
<div className="flex flex-1 flex-col gap-1.5">
<Label htmlFor="tournament-search">Search</Label>
<div className="relative">
<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
<Input
id="tournament-search"
type="search"
placeholder="Search tournaments..."
value={searchValue}
onChange={handleSearchChange}
className="pl-10 bg-background"
          />
</div>
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
        >
<RotateCcwIcon className="h-3.5 w-3.5" aria-hidden="true" />
Reset
        </Button>
</div>
</div>
  );
}
