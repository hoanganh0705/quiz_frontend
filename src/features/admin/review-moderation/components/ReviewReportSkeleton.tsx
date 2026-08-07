'use client';

/**
 * `ReviewReportSkeleton` — loading skeleton for a single report row.
 *
 * Source epic:   Epic 7.5 — Review moderation queue.
 * Source ticket: TKT-7.5.D3.
 *
 * Mirrors the row layout documented in the design language
 * (avatar / reason / status pill / action trigger). The skeleton
 * is purely presentational: it never fetches data, never holds
 * state, and never imports a hook. The parent
 * (`ReviewReportsList`) renders N rows via the `rows` prop.
 *
 * Cross-batch invariants:
 *   - The skeleton never imports a service.
 *   - The skeleton matches the row layout 1:1 so the visual
 *     hand-off at the boundary is seamless.
 */

import { Skeleton } from '@/components/ui/Skeleton';

// ─── Props ──────────────────────────────────────────────────────────────────

export interface ReviewReportSkeletonProps {
  /**
   * Number of skeleton rows to render. Defaults to 3 (the queue's
   * initial page size for a fresh load). Clamped to `>= 1`.
   */
  rows?: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ReviewReportSkeleton({
  rows = 3,
}: ReviewReportSkeletonProps): React.ReactElement {
  const count = Math.max(1, Math.floor(rows));

  return (
    <ul
      role="status"
      aria-busy="true"
      aria-label="Loading review reports"
      className="flex flex-col gap-2"
      data-testid="review-report-skeleton-list"
    >
      {Array.from({ length: count }, (_, index) => (
        <li
          key={index}
          className="flex items-center gap-4 rounded-md border border-slate-200 bg-white px-4 py-3"
          data-testid={`review-report-skeleton-row-${index}`}
        >
          {/* Avatar placeholder */}
          <Skeleton className="h-9 w-9 rounded-full" />

          {/* Reason + status text placeholder */}
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>

          {/* Status pill placeholder */}
          <Skeleton className="h-5 w-20 rounded-full" />

          {/* Action trigger placeholder */}
          <Skeleton className="h-8 w-8 rounded-md" />
        </li>
      ))}
    </ul>
  );
}
