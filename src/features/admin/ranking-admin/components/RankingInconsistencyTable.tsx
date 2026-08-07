'use client';

/**
 * `features/admin/ranking-admin/components/RankingInconsistencyTable.tsx`
 *
 * Source epic:   Epic 7.9 — Ranking Admin: Recalculate, Consistency Check, Period Reset.
 * Source ticket: TKT-7.9.D4.
 *
 * ## What this component owns
 *
 * A table component rendering the list of ranking inconsistencies returned by
 * the consistency check. The empty state renders a success-oriented alert.
 *
 * At this commit (A1 §2.3), the backend returns a summary shape, not a
 * per-item list. The `inconsistencies` prop is always `[]` and this
 * component always renders the empty state.
 */

import { CheckCircle2 } from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Skeleton } from '@/components/ui/Skeleton';

import type { RankingInconsistencyDto } from '../ranking-admin-types';

export interface RankingInconsistencyTableProps {
  /**
   * List of inconsistencies to render. Always `[]` at this commit (backend
   * returns a summary, not per-item list).
   */
  inconsistencies: RankingInconsistencyDto[];
  /** True to show skeleton loading rows. */
  isLoading?: boolean;
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      data-testid="ranking-inconsistency-empty-state"
      role="status"
      className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950"
    >
      <CheckCircle2
        className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400"
        aria-hidden="true"
      />
      <p className="text-sm text-green-700 dark:text-green-300">
        No inconsistencies found. Rankings are consistent.
      </p>
    </div>
  );
}

// ─── Skeleton rows ───────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <TableRow key={i} data-testid="ranking-inconsistency-skeleton-row">
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-12" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-12" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-16" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * Shared table component for rendering ranking inconsistencies.
 *
 * At this commit, `inconsistencies` is always `[]` (per A1 §2.3). The
 * table always renders the empty state until the backend exposes the per-item
 * list.
 */
export function RankingInconsistencyTable({
  inconsistencies,
  isLoading = false,
}: RankingInconsistencyTableProps) {
  // Empty state: no inconsistencies found.
  if (inconsistencies.length === 0 && !isLoading) {
    return <EmptyState />;
  }

  // Loading skeleton.
  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User ID</TableHead>
            <TableHead>Field</TableHead>
            <TableHead>Expected</TableHead>
            <TableHead>Actual</TableHead>
            <TableHead>Period</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <SkeletonRows />
        </TableBody>
      </Table>
    );
  }

  // Table rows.
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User ID</TableHead>
          <TableHead>Field</TableHead>
          <TableHead>Expected</TableHead>
          <TableHead>Actual</TableHead>
          <TableHead>Period</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {inconsistencies.map((item, index) => (
          <TableRow key={`${item.userId}-${item.field}-${index}`} data-testid="ranking-inconsistency-row">
            <TableCell className="font-mono text-xs">{item.userId}</TableCell>
            <TableCell>{item.field}</TableCell>
            <TableCell className="font-mono text-xs">{String(item.expected)}</TableCell>
            <TableCell className="font-mono text-xs">{String(item.actual)}</TableCell>
            <TableCell>{item.period}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
