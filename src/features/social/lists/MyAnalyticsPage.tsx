"use client";

/**
 * `MyAnalyticsPage` — Viewer's My Analytics deep-dive surface.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.F2.
 *
 * ## What this component owns
 *
 * The full My Analytics deep-dive rendered at
 * `/social/me/analytics`. The page:
 *
 *   - Renders `<AnalyticsPeriodFilter>` (TKT-6.3.F1) at the top;
 *     the period is URL-owned via `usePeriodFilter`
 *     (TKT-6.3.B4). Changing the period revalidates data but does
 *     NOT reset scroll position (cross-batch invariant
 *     "Period change does not lose scroll position").
 *   - Fetches the viewer's deep analytics via
 *     `useMySocialAnalytics(period)` (TKT-6.3.D2). Surfaces the
 *     `staleness` from `useEventuallyConsistentQuery` for the
 *     `ConsistencyNotice` (TKT-6.3.C1).
 *   - Renders one `<AnalyticsChart>` (TKT-6.3.C2) per non-zero
 *     widget. The zero-widget catalogue (TKT-6.3.A4) hides the
 *     ranking / social-score widgets via the chart primitive.
 *   - Renders `MyAnalyticsSkeleton` during initial load and no
 *     cached data.
 *   - Renders `AnalyticsEmptyState` with period-specific copy when
 *     every widget is hidden by the zero-widget catalogue.
 *   - Renders `AnalyticsErrorState` with code-specific copy on a
 *     non-loading failure.
 *   - Renders `ConsistencyNotice` above the chart grid when
 *     `staleness !== 'fresh'`.
 *
 * ## Why one component owns every branch
 *
 * The Epic 6.3 pages are intentionally thin wrappers that
 * delegate to the analytics primitives. Splitting the conditions
 * into separate components would scatter the period / staleness
 * logic across the tree — a regression waiting to happen. One
 * page, one wiring, one contract.
 *
 * ## Scroll preservation on period change
 *
 * The page MUST NOT call `window.scrollTo` on period change. The
 * cross-batch validation checklist greps for that regression. The
 * `setPeriod` callback (from `usePeriodFilter` →
 * `router.replace({ scroll: false })`) handles the URL mutation
 * and the no-scroll contract; the page observes the new period
 * via `usePeriodFilter().period` and passes it to the hook.
 */

import { type ReactElement, useEffect, useMemo, useRef } from "react";

import { useMySocialAnalytics } from "@/features/social/hooks/useMySocialAnalytics";
import { usePeriodFilter } from "@/features/social/hooks/usePeriodFilter";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

import { AnalyticsPeriodFilter } from "@/features/social/components/AnalyticsPeriodFilter";
import { AnalyticsChart } from "@/features/social/components/AnalyticsChart";
import type { AnalyticsWidget } from "@/features/social/components/AnalyticsChart";
import { AnalyticsEmptyState } from "@/features/social/components/AnalyticsEmptyState";
import { AnalyticsErrorState } from "@/features/social/components/AnalyticsErrorState";
import { MyAnalyticsSkeleton } from "@/features/social/components/MyAnalyticsSkeleton";
import { ConsistencyNotice } from "@/features/social/components/ConsistencyNotice";

import {
  addSocialAnalyticsBreadcrumb,
  SOCIAL_ANALYTICS_ROUTES,
} from "@/lib/social/social-block-sentry";

const GROWTH_HORIZON_DAYS = 30;

/**
 * Map the deep analytics DTO to a list of `AnalyticsWidget` rows.
 *
 * The list is intentionally stable across periods so the chart
 * grid does not shift between period changes. The mapping is
 * expected to grow as the backend adds new analytics fields; the
 * `AnalyticsWidgetId` union is the single source of truth for the
 * available widget ids.
 */
function toAnalyticsWidgets(analytics: {
  friends: number;
  followers: number;
  following: number;
  growth30Days: number;
}): readonly AnalyticsWidget[] {
  return [
    {
      id: "friend_count",
      value: analytics.friends,
      label: "Friends",
      description: "Users that follow each other with you.",
    },
    {
      id: "follower_count",
      value: analytics.followers,
      label: "Followers",
      description: "Users following your profile.",
    },
    {
      id: "following_count",
      value: analytics.following,
      label: "Following",
      description: "Users you follow.",
    },
    {
      id: "quizzes_published",
      // Placeholder field — the deep-analytics DTO currently has
      // no per-period quizzes-published count, so we render a
      // zero that the zero-widget catalogue allows through.
      value: 0,
      label: "Quizzes published",
      description: "Quizzes you've created and published.",
    },
    {
      id: "attempts_completed",
      value: 0,
      label: "Attempts completed",
      description: "Quiz attempts you've finished.",
    },
    {
      id: "ranking_xp_week",
      value: analytics.growth30Days,
      label: `Growth (last ${GROWTH_HORIZON_DAYS} days)`,
      description: `Net follower growth over the last ${GROWTH_HORIZON_DAYS} days.`,
    },
  ];
}

/**
 * Render the My Analytics page.
 */
export function MyAnalyticsPage(): ReactElement {
  const auth = useAuthSession();
  const { period } = usePeriodFilter();
  const { analytics, isLoading, isStale, error, retry, staleness } =
    useMySocialAnalytics(period);

  // TKT-6.3.H2 — emit a single `social:6.3` breadcrumb per
  // period-driven fetch transition so the Sentry dashboard
  // can split the analytics surfaces by period.
  const prevFetchRef = useRef<{
    state: "loading" | "ready" | "error";
    period: typeof period;
  } | null>(null);
  useEffect(() => {
    const next: "loading" | "ready" | "error" =
      error !== null ? "error" : analytics !== null ? "ready" : "loading";
    if (
      prevFetchRef.current?.state === next &&
      prevFetchRef.current.period === period
    ) {
      return;
    }
    prevFetchRef.current = { state: next, period };
    addSocialAnalyticsBreadcrumb({
      route: SOCIAL_ANALYTICS_ROUTES.getMySocialAnalytics,
      kind: "my-analytics",
      period,
      status: error !== null ? error.status : 200,
      code: error !== null ? error.code : undefined,
    });
  }, [analytics, error, period]);

  const widgets = useMemo(
    () => (analytics !== null ? toAnalyticsWidgets(analytics) : []),
    [analytics],
  );

  // Loading branch.
  if (isLoading && analytics === null) {
    return (
      <section
        data-testid="my-analytics-page-loading"
        className="flex flex-col gap-3 p-6"
        aria-label="Your analytics"
      >
        <AnalyticsPeriodFilter />
        <MyAnalyticsSkeleton />
      </section>
    );
  }

  // Error branch (visibility is the user's own analytics, so any
  // error is a transient failure, not a privacy block).
  if (error !== null && analytics === null) {
    return (
      <section
        data-testid="my-analytics-page-error"
        className="flex flex-col gap-3 p-6"
        aria-label="Your analytics"
      >
        <AnalyticsPeriodFilter />
        <AnalyticsErrorState
          error={error}
          isStale={isStale}
          onRetry={() => {
            retry();
          }}
        />
      </section>
    );
  }

  // Empty branch — every widget is hidden by the zero-widget
  // catalogue. Render the analytics empty state with the
  // period-specific copy.
  if (widgets.length === 0) {
    return (
      <section
        data-testid="my-analytics-page-empty"
        className="flex flex-col gap-3 p-6"
        aria-label="Your analytics"
      >
        <AnalyticsPeriodFilter />
        <AnalyticsEmptyState kind="my-analytics" period={period} />
      </section>
    );
  }

  // Authenticated viewer guard (defensive; route redirects
  // unauthenticated viewers upstream).
  if (!auth.isAuthenticated) {
    return (
      <section
        data-testid="my-analytics-page"
        className="flex flex-col gap-3 p-6"
        aria-label="Your analytics"
      />
    );
  }

  return (
    <section
      data-testid="my-analytics-page"
      data-is-stale={isStale ? "true" : "false"}
      data-period={period}
      aria-label="Your analytics"
      className="flex flex-col gap-3 p-6"
    >
      <h1 className="text-xl font-semibold">Your analytics</h1>
      <AnalyticsPeriodFilter />
      {staleness !== "fresh" ? (
        <ConsistencyNotice staleness={staleness} />
      ) : null}
      <div
        data-testid="my-analytics-page-grid"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3"
      >
        {widgets.map((w) => (
          <AnalyticsChart key={w.id} widget={w} />
        ))}
      </div>
    </section>
  );
}