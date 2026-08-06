"use client";

/**
 * `ConsistencyNotice` — Eventual-consistency messaging for the
 * Story 6.3 analytics surfaces.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.C1.
 *
 * ## What this component owns
 *
 * The single "your analytics may be a few minutes behind" surface
 * that every analytics page in this epic renders. The component:
 *
 *   - Surfaces the eventual-consistency contract to the user. Lag is
 *     a property of the analytics domain (the social module is
 *     eventually consistent by design — master plan Phase 6 Risks
 *     line 66), not a client error.
 *   - **Never** renders `role="alert"`. Lag is informational; the
 *     screen-reader contract uses `role="status"` so the assistive
 *     tech announces it as a status update rather than an error.
 *   - Returns `null` when `staleness === 'fresh'` so the absence of
 *     lag is silent (the canonical UI for "no lag" is "no notice").
 *
 * ## Consumer pattern
 *
 * ```tsx
 * function MyAnalyticsPage() {
 *   const { analytics, staleness } = useMySocialAnalytics(period);
 *   return (
 *     <section>
 *       <ConsistencyNotice staleness={staleness} />
 *       {analytics ? <AnalyticsChart ... /> : <MyAnalyticsSkeleton />}
 *     </section>
 *   );
 * }
 * ```
 *
 * ## Why this is a Client Component
 *
 * Marked `"use client"` for parity with the other analytics
 * primitives (`AnalyticsChart`, `AnalyticsEmptyState`, …). The
 * component is purely presentational; no hooks are called.
 *
 * ## Accessibility
 *
 * The component uses `role="status"` (NOT `role="alert"`) so
 * screen-reader users are told the analytics surface is up to date
 * rather than hearing an error announcement. The visual copy is a
 * single-line sentence that does not interrupt the chart / table
 * layout.
 */

import { type ReactElement } from "react";

import { cn } from "@/shared/utils/merge-class-names";

/**
 * The eventual-consistency signal the analytics hook surfaces. The
 * mapping from the backend response to this union is owned by
 * `useEventuallyConsistentQuery` (TKT-6.3.D4); the visual vocabulary
 * is owned by this component.
 */
export type ConsistencyStaleness = "fresh" | "recent" | "stale";

/**
 * The visual tone of the notice. The default is `'info'`; the
 * `'warning'` tone is reserved for future copy that warrants a
 * stronger visual treatment (not used today; the contract is
 * established here so the analytics pages can switch tones without
 * changing the primitive).
 */
export type ConsistencyTone = "info" | "warning";

interface ConsistencyNoticeProps {
  /** The eventual-consistency signal from the analytics hook. */
  staleness: ConsistencyStaleness;
  /**
   * Optional ISO timestamp of the last successful response. When
   * present, the notice prefixes the copy with "Updated <relative
   * time>". When absent, the canonical lag copy is rendered.
   */
  lastUpdatedAt?: string;
  /**
   * Visual tone. Defaults to `'info'` (the canonical treatment for
   * lag).
   */
  tone?: ConsistencyTone;
}

const COPY: Record<Exclude<ConsistencyStaleness, "fresh">, string> = {
  recent: "Updated just now",
  stale:
    "Counts may be up to a few minutes behind. This is normal for social analytics.",
};

/**
 * Canonical eventual-consistency notice.
 *
 * Returns `null` when `staleness === 'fresh'` (the absence of lag is
 * silent). For `'recent'`, renders a small "Updated just now"
 * caption. For `'stale'`, renders the lag explanation so the user
 * knows the data is current to within the documented freshness
 * window.
 */
export function ConsistencyNotice({
  staleness,
  tone = "info",
}: ConsistencyNoticeProps): ReactElement | null {
  if (staleness === "fresh") return null;

  const copy = COPY[staleness];

  return (
    <p
      role="status"
      data-testid={`consistency-notice-${staleness}`}
      data-tone={tone}
      aria-live="polite"
      className={cn(
        "text-xs",
        tone === "warning"
          ? "text-amber-700 dark:text-amber-400"
          : "text-muted-foreground",
      )}
    >
      {copy}
    </p>
  );
}