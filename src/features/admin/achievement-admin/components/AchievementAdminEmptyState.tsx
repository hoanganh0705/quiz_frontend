'use client';

/**
 * `features/admin/achievement-admin/components/AchievementAdminEmptyState.tsx`
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.D5 (part b).
 *
 * ## What this component owns
 *
 * - Empty-list state for the achievement admin badge list.
 * - Copy: "This user has no badges yet."
 */

export interface AchievementAdminEmptyStateProps {
  /** Optional userId for context. */
  userId?: string;
}

/**
 * Empty-state for the achievement admin badge list.
 */
export function AchievementAdminEmptyState({
  userId,
}: AchievementAdminEmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/20 p-8 text-center"
      data-testid="achievement-admin-empty-state"
    >
      {/* Inline SVG icon — no external icon dependency needed. */}
      <svg
        className="mb-3 h-10 w-10 text-muted-foreground/50"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
        />
      </svg>
      <p
        className="text-sm font-medium text-muted-foreground"
        data-testid="achievement-admin-empty-state-title"
      >
        No badges yet
      </p>
      <p
        className="mt-1 text-xs text-muted-foreground/70"
        data-testid="achievement-admin-empty-state-description"
      >
        This user has no badges yet.
        {userId ? ` (${userId})` : ''}
      </p>
    </div>
  );
}
