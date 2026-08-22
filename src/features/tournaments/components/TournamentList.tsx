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
        <div className="flex justify-center py-4" aria-live="polite" aria-busy={isLoadingMore}>
          {isLoadingMore ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2
                className={cn("h-5 w-5", !prefersReducedMotion && "animate-spin")}
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
