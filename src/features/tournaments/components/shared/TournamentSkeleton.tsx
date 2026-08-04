"use client";

/**
 * `TournamentSkeleton` — skeleton for tournament card and detail views.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.2 — Tournament discovery and read-only detail surfaces.
 * Source ticket: TKT-5.2.C1.
 */

import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/shared/utils/merge-class-names";

interface TournamentCardSkeletonProps {
  className?: string;
}

interface TournamentDetailSkeletonProps {
  className?: string;
}

// ─── Card skeleton ─────────────────────────────────────────────────────────

/**
 * Skeleton card for the tournament list.
 * Matches the shape of `TournamentCard`.
 */
export function TournamentCardSkeleton({ className }: TournamentCardSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-3",
        className,
      )}
    >
      {/* Header row: status badge + title */}
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Title */}
      <Skeleton className="h-5 w-3/4" />

      {/* Description snippet */}
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />

      {/* Meta row: dates */}
      <div className="flex items-center gap-4 pt-1">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>

      {/* Footer: participants + CTA */}
      <div className="flex items-center justify-between pt-2 border-t">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
}

// ─── Detail skeleton ──────────────────────────────────────────────────────

/**
 * Skeleton for the tournament detail view.
 * Includes header, stats rows, and description area.
 */
export function TournamentDetailSkeleton({ className }: TournamentDetailSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {["Participants", "Prize", "Difficulty", "Status"].map((label) => (
          <div key={label} className="p-4 border rounded-lg space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>

      {/* Dates */}
      <div className="flex flex-wrap gap-6">
        {["Starts", "Ends", "Registration Opens", "Registration Closes"].map((label) => (
          <div key={label} className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Rules */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      {/* CTA */}
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}
