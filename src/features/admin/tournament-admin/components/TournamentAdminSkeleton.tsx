/**
 * `TournamentAdminSkeleton` — loading skeleton for the tournament admin list.
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.D5 (AC #1).
 *
 * Renders N skeleton rows that mirror the row layout (name / status pill /
 * capacity / actions). Each row uses the design-system `Skeleton` primitive.
 */

'use client';

import { Skeleton } from '@/components/ui/Skeleton';

export interface TournamentAdminSkeletonProps {
  /** Number of rows to render. Defaults to 5 for a comfortable default. */
  rows?: number;
}

export function TournamentAdminSkeleton({
  rows = 5,
}: TournamentAdminSkeletonProps): React.ReactElement {
  return (
    <div
      className="space-y-2"
      data-testid="tournament-admin-skeleton"
      aria-busy="true"
      aria-label="Loading tournaments"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-md border p-3"
          data-testid="tournament-admin-skeleton-row"
        >
          {/* Title + description */}
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>

          {/* Status pill */}
          <Skeleton className="h-5 w-20 rounded-full" />

          {/* Window */}
          <div className="hidden w-36 space-y-1 sm:block">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>

          {/* Capacity */}
          <Skeleton className="h-4 w-16" />

          {/* Actions */}
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}
