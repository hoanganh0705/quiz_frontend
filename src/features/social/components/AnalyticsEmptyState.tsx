"use client";

/**
 * `AnalyticsEmptyState` — Canonical empty state for the Story 6.3
 * analytics surfaces.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.C3.
 *
 * ## What this component owns
 *
 * The single "no activity yet" surface that every analytics page
 * renders when its hook returns an empty result. The component
 * takes the `kind` so it can pick the right empty copy ("no
 * activity this week" for My Analytics, "this user hasn't shared
 * public stats yet" for UserStatsCard, "no friends on the
 * leaderboard yet" for the Friend Leaderboard) AND the `period`
 * so the My Analytics copy tracks the period filter.
 *
 * ## Why period-specific copy
 *
 * Story 6.3 Exit Criterion #8 ("Empty-state copy distinguishes the
 * three periods") requires the My Analytics empty state to read
 * "No activity this week" when the filter is `'week'` and "No
 * activity this month" when the filter is `'month'`. The
 * period-agnostic copy ("No activity recorded") is reserved for the
 * `'all'` period and for the non-My-Analytics kinds.
 *
 * ## Why this is a Client Component
 *
 * Marked `"use client"` for parity with the other analytics
 * primitives. The component is purely presentational; no hooks are
 * called.
 */

import { type ReactElement } from "react";

import type { AnalyticsPeriod } from "@/features/social/types/analytics";

/**
 * The three analytics kinds that own an empty state. The Social Hub
 * does not have an empty state (it composes a counts card + three
 * entry tiles; an "empty hub" is the placeholder surface).
 */
export type AnalyticsEmptyKind = "my-analytics" | "stats" | "leaderboard";

interface AnalyticsEmptyStateProps {
  /** The analytics surface the empty state represents. */
  kind: AnalyticsEmptyKind;
  /**
   * Optional period for the empty-state copy. Required for
   * `kind: 'my-analytics'`; ignored for the other kinds (their copy
   * is period-agnostic).
   */
  period?: AnalyticsPeriod;
}

const PERIOD_COPY: Record<AnalyticsPeriod, string> = {
  week: "No activity this week",
  month: "No activity this month",
  all: "No activity recorded",
};

const KIND_COPY: Record<AnalyticsEmptyKind, string> = {
  "my-analytics":
    "Once you start using the social features, your weekly numbers will appear here.",
  stats:
    "This user hasn't shared any public social stats yet. Check back later.",
  leaderboard:
    "Once you have friends with activity, the leaderboard will populate here.",
};

/**
 * Canonical analytics empty state.
 */
export function AnalyticsEmptyState({
  kind,
  period,
}: AnalyticsEmptyStateProps): ReactElement {
  const title =
    kind === "my-analytics" && period
      ? PERIOD_COPY[period]
      : "Nothing to show";
  const description = KIND_COPY[kind];
  return (
    <section
      role="status"
      aria-live="polite"
      data-testid={`analytics-empty-${kind}${period ? `-${period}` : ""}`}
      className="flex flex-col gap-2 p-6 rounded-md border border-dashed border-border text-center"
    >
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </section>
  );
}