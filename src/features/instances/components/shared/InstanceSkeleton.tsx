"use client";

/**
 * `InstanceSkeleton` — deterministic skeleton for the instance lobby,
 * player roster, and host controls.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.C1.
 *
 * The skeleton mirrors the shape of the real layout so swapping the
 * placeholder for live content does not cause layout shift. It does
 * not advance the lifecycle state, start any timers, or call into the
 * service layer — it is a presentational primitive only.
 */

import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/shared/utils/merge-class-names";

// ─── Lobby skeleton ──────────────────────────────────────────────────────

interface InstanceLobbySkeletonProps {
  className?: string;
}

/**
 * Skeleton for the instance lobby layout. Mirrors the
 * `InstanceLobby` composition: status banner, connection banner,
 * player roster, and CTAs.
 */
export function InstanceLobbySkeleton({
  className,
}: InstanceLobbySkeletonProps) {
  return (
    <div
      className={cn("space-y-6", className)}
      data-testid="instance-lobby-skeleton"
    >
      {/* Status banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-5 w-32" />
      </div>

      {/* Connection banner */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg border">
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>

      {/* Roster */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg border"
            >
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-10 w-full sm:w-40 rounded-md" />
        <Skeleton className="h-10 w-full sm:w-40 rounded-md" />
      </div>
    </div>
  );
}

// ─── Roster row skeleton ──────────────────────────────────────────────────

interface InstanceRosterRowSkeletonProps {
  className?: string;
}

/**
 * Skeleton for a single player roster row. Matches the shape of the
 * merged (REST + realtime) roster entry.
 */
export function InstanceRosterRowSkeleton({
  className,
}: InstanceRosterRowSkeletonProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border",
        className,
      )}
      data-testid="instance-roster-row-skeleton"
    >
      <Skeleton className="h-9 w-9 rounded-full" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-5 w-14 rounded-full" />
    </div>
  );
}