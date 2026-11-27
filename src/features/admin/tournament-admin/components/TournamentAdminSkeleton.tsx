"use client";

import type React from "react";

import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/shared/utils/merge-class-names";

import { TOURNAMENT_TABLE_GRID_CLASS } from "./TournamentAdminItem";

export interface TournamentAdminSkeletonProps {
  rows?: number;
}

export function TournamentAdminSkeleton({
  rows = 5,
}: TournamentAdminSkeletonProps): React.ReactElement {
  return (
    <div
      role="status"
      data-testid="tournament-admin-skeleton"
      aria-busy="true"
      aria-label="Loading tournaments"
    >
      <div
        className={cn(
          "hidden border-b border-border bg-muted/10 px-4 py-2",
          TOURNAMENT_TABLE_GRID_CLASS,
        )}
        aria-hidden="true"
      >
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-10 ml-auto" />
      </div>

      <div className="divide-y divide-border/60">
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col gap-2.5 px-4 py-3.5",
              TOURNAMENT_TABLE_GRID_CLASS,
            )}
            data-testid="tournament-admin-skeleton-row"
          >
            {/* Title + subtitle */}
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-4 w-48 max-w-full" />
                <Skeleton className="h-3 w-64 max-w-full" />
              </div>
              <Skeleton className="h-10 w-10 rounded-md shrink-0 lg:hidden" />
            </div>

            {/* Schedule */}
            <Skeleton className="h-3.5 w-44 max-w-full" />

            {/* Difficulty / Cap / Status */}
            <div className="flex items-center gap-2 lg:contents">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3.5 w-14" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>

            {/* Desktop action menu */}
            <Skeleton className="hidden lg:block h-9 w-9 rounded-md ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
