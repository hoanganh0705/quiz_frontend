"use client";

import * as React from "react";

import { useTournamentFeatureFlag } from "@/features/tournaments/hooks";
import { useTournamentFilters } from "@/features/tournaments/hooks";
import { useTournaments } from "@/features/tournaments/hooks";

import {
TournamentPlaceholder,
TournamentFilters,
TournamentList,
} from "@/features/tournaments/components";

export interface TournamentsPageProps {

className?: string;
}

export function TournamentsPage({ className }: TournamentsPageProps) {
const { isPlaceholder } = useTournamentFeatureFlag();

const { filters, setFilter, resetFilters } = useTournamentFilters();
const tournamentsResult = useTournaments(filters);

if (isPlaceholder) {
return <TournamentPlaceholder />;
  }

return (
<div className={className}>
<div className="space-y-6">
<TournamentFilters
filters={filters}
onFilterChange={setFilter}
onReset={resetFilters}
        />
<TournamentList tournamentsResult={tournamentsResult} />
</div>
</div>
  );
}
