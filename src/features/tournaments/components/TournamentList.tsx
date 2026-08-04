"use client";

/**
 * `TournamentList` — composed tournament list surface.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.2 — Tournament discovery and read-only detail surfaces.
 * Source ticket: TKT-5.2.D4.
 *
 * ## What this component owns
 *
 * - Renders skeleton rows while loading.
 * - Renders `TournamentCard` rows from the hook.
 * - Renders load-more affordance when `hasMore` is true.
 * - Renders inline spinner when loading more.
 * - Renders empty state when no items.
 * - Renders error state with retry on error.
 * - Renders stale-data warning banner when `isStale` is true.
 *
 * ## What this component does NOT own
 *
 * - No service or store code beyond the documented hook import.
 */

import * as React from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";

import {
  TournamentListSkeleton,
  TournamentEmptyState,
  TournamentErrorState,
  TournamentStaleState,
} from "./shared";

import { TournamentCard } from "./TournamentCard";
import type { UseTournamentsResult } from "@/features/tournaments/hooks/useTournaments";

export interface TournamentListProps {
  /** Result from `useTournaments`. */
  tournamentsResult: UseTournamentsResult;
  /** Optional class name applied to the root. */
  className?: string;
}

export function TournamentList({
  tournamentsResult,
  className,
}: TournamentListProps) {
  const {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    error,
    refresh,
    isStale,
  } = tournamentsResult;

  // 1. Loading: show skeleton.
  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <TournamentListSkeleton count={8} />
      </div>
    );
  }

  // 2. Error: show error state with retry.
  if (error !== null) {
    return (
      <div className={cn("space-y-4", className)}>
        <TournamentErrorState error={error} onRetry={refresh} />
      </div>
    );
  }

  // 3. Empty: show empty state.
  if (items.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <TournamentEmptyState variant="list" />
      </div>
    );
  }

  // 4. Success: show list with stale warning (if stale) and cards.
  return (
    <div className={cn("space-y-4", className)}>
      {/* Stale data warning banner */}
      {isStale && (
        <TournamentStaleState onRetry={refresh} />
      )}

      {/* Cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((tournament) => (
          <TournamentCard
            key={tournament.id}
            tournament={tournament}
          />
        ))}
      </div>

      {/* Load more affordance */}
      {hasMore && (
        <div className="flex justify-center py-4">
          {isLoadingMore ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading more...</span>
            </div>
          ) : (
            <Button onClick={loadMore} variant="outline">
              Load More
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
