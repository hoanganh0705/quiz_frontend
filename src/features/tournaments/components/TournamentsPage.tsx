"use client";

/**
 * `TournamentsPage` — tournament list page composition.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.2 — Tournament discovery and read-only detail surfaces.
 * Source ticket: TKT-5.2.G1.
 */

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
  /** Optional class name. */
  className?: string;
}

export function TournamentsPage({ className }: TournamentsPageProps) {
  const { isPlaceholder } = useTournamentFeatureFlag();

  // Always call hooks first - React Rules of Hooks require this
  const { filters, setFilter, resetFilters } = useTournamentFilters();
  const tournamentsResult = useTournaments(filters);

  // Placeholder state after hooks
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
