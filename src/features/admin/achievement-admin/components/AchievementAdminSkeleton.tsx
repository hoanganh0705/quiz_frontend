'use client';

/**
 * `features/admin/achievement-admin/components/AchievementAdminSkeleton.tsx`
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.D5 (part a).
 *
 * ## What this component owns
 *
 * - Badge list skeleton for the achievement admin surface.
 * - Mirrors the layout of `AchievementAdminBadgeList` (BadgeAdminBadgeList
 *   is consumed by this surface via the admin achievement list component).
 */

export interface AchievementAdminSkeletonProps {
  /**
   * Number of skeleton rows to render.
   * Defaults to 5.
   */
  count?: number;
}

/**
 * Badge list skeleton for the achievement admin surface.
 */
export function AchievementAdminSkeleton({
  count = 5,
}: AchievementAdminSkeletonProps) {
  return (
    <div
      className="space-y-3"
      role="status"
      aria-label="Loading badges…"
      data-testid="achievement-admin-skeleton"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-md border border-border bg-background p-3"
          data-testid="achievement-admin-skeleton-row"
        >
          {/* Badge icon placeholder */}
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          {/* Badge name */}
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          {/* Tier badge */}
          <div className="ml-auto h-5 w-16 animate-pulse rounded-full bg-muted" />
        </div>
      ))}
      <span className="sr-only">Loading badges…</span>
    </div>
  );
}
