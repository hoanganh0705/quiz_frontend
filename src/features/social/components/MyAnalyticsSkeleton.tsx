"use client";

/**
 * `MyAnalyticsSkeleton` — Loading placeholder for the My Analytics
 * deep-dive page.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.C4.
 *
 * ## What this component owns
 *
 * A configurable-widget-count shimmer placeholder rendered by
 * `MyAnalyticsPage` (TKT-6.3.F2) while its initial SWR load is in
 * flight. The skeleton mirrors the eventual layout of the My
 * Analytics page (a `ConsistencyNotice` caption + a grid of
 * `AnalyticsChart` widgets + a period filter strip).
 *
 * ## Accessibility
 *
 * Sets `aria-busy="true"` on the root so screen readers announce the
 * loading state. The component is purely visual; no live region
 * markup is needed because the live surface replaces the skeleton
 * once loaded.
 *
 * ## Why this is a Client Component
 *
 * Marked `"use client"` for parity with `SocialListSkeleton`
 * (TKT-6.2.C2) and the rest of the analytics primitives.
 */

import { type ReactElement } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

const DEFAULT_WIDGET_COUNT = 6;

interface MyAnalyticsSkeletonProps {
  /**
   * Number of widget placeholder tiles to render. Defaults to 6
   * (matches the documented My Analytics widget set: quizzes
   * published, attempts completed, ranking XP × 3, social score
   * × 3).
   */
  widgetCount?: number;
}

export function MyAnalyticsSkeleton({
  widgetCount = DEFAULT_WIDGET_COUNT,
}: MyAnalyticsSkeletonProps = {}): ReactElement {
  const widgets = Array.from({ length: widgetCount });
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading my analytics"
      data-testid="my-analytics-skeleton"
      data-widget-count={widgetCount}
      className="flex flex-col gap-4 p-6"
    >
      <Skeleton className="h-4 w-40" />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {widgets.map((_, i) => (
          <div key={i} className="flex flex-col gap-2 p-3 rounded-md border border-border">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}