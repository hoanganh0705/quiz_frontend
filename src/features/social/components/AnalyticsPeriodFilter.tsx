"use client";

/**
 * `AnalyticsPeriodFilter` — URL-driven period selector for the
 * Story 6.3 analytics surfaces.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.F1.
 *
 * ## What this component owns
 *
 * The three-option period selector rendered at the top of the My
 * Analytics page (and any future period-filtered analytics surface
 * that wants a drop-in primitive). The component:
 *
 *   - Reads the current period from `usePeriodFilter`
 *     (TKT-6.3.B4) — the URL is the single source of truth,
 *     component state is never authoritative.
 *   - Renders the three options (`This week` / `This month` /
 *     `All time`) with the current period highlighted.
 *   - On click, calls `usePeriodFilter.setPeriod`. The hook uses
 *     `router.replace({ scroll: false })` internally; the
 *     component MUST NOT call `window.scrollTo` on period change.
 *
 * ## Why a controlled primitive (not an unstyled `<select>`)
 *
 * The Epic 6.3 design-system team shipped a `SegmentedControl`
 * primitive for period filters. The component delegates the
 * visual rendering to that primitive so future visual
 * refreshes are a single-point edit. The behaviour contract
 * (URL ownership, scroll preservation, three-option union) is
 * owned by *this* component, not by the primitive.
 *
 * ## SSR-safety
 *
 * The component reads from `useSearchParams()` via the hook.
 * Both are client-side; the analytics surface that consumes
 * this component is wrapped in a `<Suspense>` boundary by the
 * route shell (per the Epic 6.2 / B2 convention).
 */

import { type ReactElement } from "react";

import { usePeriodFilter } from "@/features/social/hooks/usePeriodFilter";
import {
  ANALYTICS_PERIOD_LABELS,
  type AnalyticsPeriod,
} from "@/features/social/types/analytics";

interface AnalyticsPeriodFilterProps {
  /**
   * Optional per-period label overrides. Useful for tests and
   * future locale support.
   */
  labels?: Partial<Record<AnalyticsPeriod, string>>;
}

const PERIODS: readonly AnalyticsPeriod[] = ["week", "month", "all"];

/**
 * Render the URL-driven period selector.
 */
export function AnalyticsPeriodFilter(
  props: AnalyticsPeriodFilterProps = {},
): ReactElement {
  const { labels } = props;
  const { period, setPeriod } = usePeriodFilter();

  return (
    <div
      role="radiogroup"
      aria-label="Analytics period"
      data-testid="analytics-period-filter"
      data-current-period={period}
      className="flex flex-row gap-1 rounded-md border border-border p-1"
    >
      {PERIODS.map((p) => {
        const isCurrent = p === period;
        const label = labels?.[p] ?? ANALYTICS_PERIOD_LABELS[p];
        return (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={isCurrent}
            data-testid={`analytics-period-filter-option-${p}`}
            data-current={isCurrent ? "true" : "false"}
            onClick={() => {
              setPeriod(p);
            }}
            className={
              isCurrent
                ? "rounded-sm bg-accent px-3 py-1 text-sm font-medium"
                : "rounded-sm px-3 py-1 text-sm hover:bg-accent"
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}