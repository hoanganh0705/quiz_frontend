"use client";

export interface AuditLogSkeletonProps {
  count?: number;
}

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
          className="rounded-lg border border-border/80 bg-card p-3 sm:p-3.5 shadow-2xs"
          data-testid="audit-log-skeleton-row"
        >
          <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[140px_1fr_auto] lg:grid-cols-[160px_1fr_160px_110px_auto] sm:items-center sm:gap-4">
            {/* Action placeholder */}
            <div className="flex items-center justify-between sm:justify-start">
              <div className="h-5 w-28 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted sm:hidden" />
            </div>
            {/* Target placeholder */}
            <div className="h-4 w-36 animate-pulse rounded bg-muted" />
            {/* Actor placeholder */}
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            {/* Request ID placeholder (Desktop only) */}
            <div className="hidden lg:block h-4 w-20 animate-pulse rounded bg-muted" />
            {/* Timestamp placeholder (Tablet & Desktop) */}
            <div className="hidden sm:block ml-auto h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading audit log entries…</span>
    </div>
  );
}
