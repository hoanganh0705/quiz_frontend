"use client";

import * as React from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";
import { usePrefersReducedMotion } from "@/shared/hooks";

import {
  TournamentListSkeleton,
  TournamentEmptyState,
  TournamentErrorState,
  TournamentStaleState,
} from "./shared";

import { TournamentCard } from "./TournamentCard";
import type { UseTournamentsResult } from "@/features/tournaments/hooks/useTournaments";

export interface TournamentListProps {
  tournamentsResult: UseTournamentsResult;

  className?: string;
}

export function TournamentList({
  tournamentsResult,
  className,
}: TournamentListProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
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

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <TournamentListSkeleton count={8} />
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className={cn("space-y-4", className)}>
        <TournamentErrorState error={error} onRetry={refresh} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <TournamentEmptyState variant="list" />
      </div>
    );
  }

  return (
    <div
      id="tournament-list-panel"
      role="tabpanel"
      aria-label="Tournament results"
      className={cn("space-y-6", className)}
    >
      {/* Stale data warning banner */}
      {isStale && <TournamentStaleState onRetry={refresh} />}

      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Available Tournaments
        </h2>
        <span
          className="text-xs font-mono font-medium tabular-nums text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          Showing {items.length} {items.length === 1 ? "tournament" : "tournaments"}
        </span>
      </div>

      {/* Cards grid */}
      <div
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        role="list"
        aria-label="Tournaments"
      >
        {items.map((tournament) => (
          <TournamentCard key={tournament.id} tournament={tournament} />
        ))}
      </div>

      {/* Load more affordance */}
      {hasMore && (
        <div
          className="flex justify-center py-4"
          aria-live="polite"
          aria-busy={isLoadingMore}
        >
          {isLoadingMore ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2
                className={cn(
                  "h-5 w-5",
                  !prefersReducedMotion && "animate-spin",
                )}
                aria-hidden="true"
              />
              <span className="text-sm">Loading more...</span>
              <span className="sr-only">Loading more tournaments...</span>
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
