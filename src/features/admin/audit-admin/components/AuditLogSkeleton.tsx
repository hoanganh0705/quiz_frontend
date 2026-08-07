'use client';

/**
 * `AuditLogSkeleton.tsx`
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.D6.
 *
 * ## What this component owns
 *
 * Loading skeleton for the audit log list. Mirrors the layout
 * of `AuditLogItem`.
 */

export interface AuditLogSkeletonProps {
  /**
   * Number of skeleton rows to render.
   * Defaults to 5.
   */
  count?: number;
}

/**
 * Audit log list skeleton.
 */
export function AuditLogSkeleton({ count = 5 }: AuditLogSkeletonProps) {
  return (
    <div
      className="space-y-2"
      role="status"
      aria-label="Loading audit log entries…"
      data-testid="audit-log-skeleton"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-md border border-border bg-background p-3"
          data-testid="audit-log-skeleton-row"
        >
          {/* Action placeholder */}
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          {/* Target placeholder */}
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          {/* Actor placeholder */}
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          {/* Timestamp placeholder (pushed to right) */}
          <div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" />
        </div>
      ))}
      <span className="sr-only">Loading audit log entries…</span>
    </div>
  );
}