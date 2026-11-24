"use client";

import * as React from "react";

import { useTournamentFilters } from "@/features/tournaments/hooks";
import { useTournaments } from "@/features/tournaments/hooks";

import {
  TournamentFilters,
  TournamentList,
} from "@/features/tournaments/components";

export interface TournamentsPageProps {
  className?: string;
}

export function TournamentsPage({ className }: TournamentsPageProps) {

  const { filters, setFilter, resetFilters } = useTournamentFilters();
  const tournamentsResult = useTournaments(filters);

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
