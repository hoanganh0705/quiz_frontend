"use client";

/**
 * `UserStatsCard` — Per-user social stats surface.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.E3.
 *
 * ## What this component owns
 *
 * The full per-user stats surface rendered at
 * `/social/users/:id/stats`. The component composes the
 * analytics primitives (privacy notice, chart, empty / error
 * / skeleton, eventual-consistency notice) and the
 * `useUserSocialStats` hook (TKT-6.3.D1) to handle every
 * documented branch:
 *
 *   - **`visibility !== 'visible'`** → render
 *     `PrivacyRestrictedNotice` (Epic 6.2 / TKT-6.2.F1) with the
 *     `not_available` variant. **No `AnalyticsChart` is
 *     rendered.** The DTO is treated as private; the chart
 *     primitives must NEVER see privacy-blocked data.
 *   - **`visibility === 'visible'` + `isLoading` (no cached
 *     data)** → render `UserStatsSkeleton`.
 *   - **`visibility === 'visible'` + populated** → render one
 *     `AnalyticsChart` per non-zero widget. The zero-widget
 *     catalogue (TKT-6.3.A4) hides the ranking / social-score
 *     widgets via the chart primitive — this page never
 *     queries the catalogue directly.
 *   - **`staleness !== 'fresh'`** → render `ConsistencyNotice`
 *     above the chart grid so the user knows the data is up
 *     to a few minutes behind.
 *   - **Error + not loading** → render `AnalyticsErrorState`
 *     with code-specific copy and a retry CTA.
 *
 * ## Why a single component owns every branch
 *
 * The Epic 6.3 pages are intentionally thin wrappers that
 * delegate to the analytics primitives. Splitting the
 * conditions into separate components would scatter the
 * privacy decision across the tree (a privacy leak waiting to
 * happen). One component, one privacy check, one render.
 *
 * ## Viewer / target privacy
 *
 * The card renders for the viewer's own stats (when
 * `targetUserId === currentUserId`) by short-circuiting
 * `useUserSocialStats` to its "self" result. In that branch
 * the visibility field is `'visible'`, the DTO is `null`, and
 * the card renders the skeleton + an info banner rather than
 * fetching the target's stats from the public endpoint.
 *
 * ## Error / DTO discipline
 *
 * The card treats `error` and `stats` as **mutually exclusive**
 * in the visible branches. `useUserSocialStats` already nulls
 * `error` when the visibility is a privacy variant, but the
 * card re-checks the order in render to defend against a
 * future regression.
 */

import { type ReactElement, useEffect, useMemo, useRef } from "react";

import { useUserSocialStats } from "@/features/social/hooks/useUserSocialStats";
import { useAuthBootstrap } from "@/features/auth/contexts/auth-bootstrap-context";

import { type AnalyticsWidget } from "@/features/social/components/AnalyticsChart";
import { AnalyticsEmptyState } from "@/features/social/components/AnalyticsEmptyState";
import { AnalyticsErrorState } from "@/features/social/components/AnalyticsErrorState";
import { AnalyticsChart } from "@/features/social/components/AnalyticsChart";
import { ConsistencyNotice } from "@/features/social/components/ConsistencyNotice";
import { PrivacyRestrictedNotice } from "@/features/social/components/PrivacyRestrictedNotice";
import { UserStatsSkeleton } from "@/features/social/components/UserStatsSkeleton";

import {
  addSocialAnalyticsBreadcrumb,
  SOCIAL_ANALYTICS_ROUTES,
} from "@/lib/social/phase6_6_3_sentry";

interface UserStatsCardProps {
  /** The target user id whose stats are being rendered. */
  targetUserId: string;
}

/**
 * Map the per-user stats DTO to a list of `AnalyticsWidget` rows.
 *
 * Each row carries the `AnalyticsWidgetId` the
 * `AnalyticsChart` primitive uses to consult the zero-widget
 * catalogue. The mapping is intentionally narrow — adding a
 * new field to `SocialUserStatsDto` is a TypeScript error
 * until the widget list is updated.
 */
function toAnalyticsWidgets(stats: {
  friends: number;
  followers: number;
  following: number;
}): readonly AnalyticsWidget[] {
  return [
    {
      id: "friend_count",
      value: stats.friends,
      label: "Friends",
      description: "The number of users you both follow each other with.",
    },
    {
      id: "follower_count",
      value: stats.followers,
      label: "Followers",
      description: "Users following this profile.",
    },
    {
      id: "following_count",
      value: stats.following,
      label: "Following",
      description: "Users this profile follows.",
    },
  ];
}

/**
 * Render a target user's social stats.
 */
export function UserStatsCard({
  targetUserId,
}: UserStatsCardProps): ReactElement {
  const result = useUserSocialStats(targetUserId);
  const { visibility, stats, isLoading, isStale, error, retry } = result;

  const auth = useAuthBootstrap();
  const viewerId = auth.currentUser?.userId ?? null;
  const isSelf = viewerId !== null && viewerId === targetUserId;

  // TKT-6.3.H2 — emit a single `phase6:6.3` breadcrumb per fetch
  // transition. `error` is intentionally not in the dependency
  // list: the privacy branch renders the privacy notice rather
  // than the error, so emitting an error breadcrumb when the
  // error is a privacy variant would be noisy and misleading.
  const prevFetchStateRef = useRef<"loading" | "ready" | "error">(
    error !== null ? "error" : stats !== null ? "ready" : "loading",
  );
  useEffect(() => {
    const next: "loading" | "ready" | "error" =
      error !== null ? "error" : stats !== null ? "ready" : "loading";
    if (prevFetchStateRef.current === next) return;
    prevFetchStateRef.current = next;
    addSocialAnalyticsBreadcrumb({
      route: SOCIAL_ANALYTICS_ROUTES.getUserSocialStats,
      kind: "stats",
      targetUserId,
      status: error !== null ? error.status : 200,
      code: error !== null ? error.code : undefined,
    });
  }, [stats, error, targetUserId]);

  const widgets = useMemo(
    () => (stats !== null ? toAnalyticsWidgets(stats) : []),
    [stats],
  );

  // Privacy branch. A blocked / private / not-found viewer
  // never sees the charts.
  if (visibility !== "visible") {
    return (
      <PrivacyRestrictedNotice
        variant="not_available"
        resourceKind="blocked"
      />
    );
  }

  // Loading branch (no cached data).
  if (isLoading && stats === null) {
    return <UserStatsSkeleton />;
  }

  // Self branch — the viewer is the target. The hook
  // short-circuited to a "visible-but-empty" result; render a
  // skeleton + a link to the My Analytics page so the viewer
  // has somewhere useful to go.
  if (isSelf && stats === null) {
    return (
      <section
        data-testid="user-stats-card-self"
        className="flex flex-col gap-3 p-6"
        aria-label="Your stats"
      >
        <h2 className="text-lg font-semibold">Your stats</h2>
        <p className="text-sm text-muted-foreground">
          See your deeper analytics on the My Analytics page.
        </p>
        <UserStatsSkeleton />
      </section>
    );
  }

  // Error branch (visibility is 'visible' so the error is a
  // transient failure, not a privacy block).
  if (error !== null && stats === null) {
    return (
      <AnalyticsErrorState
        error={error}
        isStale={isStale}
        onRetry={() => {
          retry();
        }}
      />
    );
  }

  // Empty branch (the zero-widget catalogue hid every chart).
  if (widgets.length === 0) {
    return <AnalyticsEmptyState kind="stats" />;
  }

  return (
    <section
      data-testid="user-stats-card"
      data-is-stale={isStale ? "true" : "false"}
      aria-label={`Stats for user ${targetUserId}`}
      className="flex flex-col gap-3 p-6"
    >
      <h2 className="text-lg font-semibold">Stats</h2>
      {stats !== null && stats.isStale === true ? (
        <ConsistencyNotice staleness="stale" />
      ) : null}
      <div
        data-testid="user-stats-card-grid"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3"
      >
        {widgets.map((w) => (
          <AnalyticsChart key={w.id} widget={w} />
        ))}
      </div>
      {stats !== null && stats.isStale === true ? null : isStale ? (
        <ConsistencyNotice staleness="recent" />
      ) : null}
    </section>
  );
}