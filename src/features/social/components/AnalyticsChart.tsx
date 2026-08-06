"use client";

/**
 * `AnalyticsChart` — Single analytics-widget renderer with
 * zero-widget hiding.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.C2.
 *
 * ## What this component owns
 *
 * The single visual vocabulary for an analytics widget — used by
 * the My Analytics page (`MyAnalyticsPage`, TKT-6.3.F2) and the
 * per-user Stats card (`UserStatsCard`, TKT-6.3.E3). The component:
 *
 *   - Consults `isZeroWidget(id)` from the analytics-zero widget
 *     catalogue (TKT-6.3.A4) before rendering. When the widget is
 *     in the catalogue, the component returns `null` — no
 *     placeholder, no empty tile, no "0" rendered as data.
 *   - When the widget is NOT a zero widget, the component renders
 *     the value with the label and the documented description.
 *   - **Never** renders `role="alert"` for zero widgets. The absence
 *     of a widget is silent (the canonical "we are not showing this"
 *     is "we are showing nothing").
 *
 * ## Why the chart primitive is widget-typed (not generic)
 *
 * The analytics surface composes a heterogeneous list of widgets
 * (quizzes published, attempts completed, ranking XP, …). The
 * catalogue from TKT-6.3.A4 is the single source of truth for
 * which widgets are zero. A generic `<AnalyticsChart value={n} />`
 * cannot consult the catalogue because it does not know the widget
 * id. The widget-typed API (`{ id, value, label, description }`)
 * closes that gap.
 *
 * ## Accessibility
 *
 *   - The visible label is the widget name (`label`).
 *   - The accessible description is the widget's `description`
 *     (`aria-describedby`); screen readers announce the value with
 *     the documented context.
 *   - The root is `role="figure"` so the widget is a single
 *     navigable landmark rather than a pile of unrelated elements.
 *
 * ## Why this is a Client Component
 *
 * Marked `"use client"` for parity with the other analytics
 * primitives (`ConsistencyNotice`, `AnalyticsEmptyState`, …). The
 * component is purely presentational; no hooks are called.
 */

import { type ReactElement } from "react";

import {
  type AnalyticsWidgetId,
  isZeroWidget,
} from "@/features/social/analytics-zero-widget-catalog";

/**
 * The shape of a single analytics widget. The shape is intentionally
 * closed — every widget the analytics surface renders has the same
 * three fields (id, value, label). The optional `description` lets
 * the analytics page supply a domain-specific explanation
 * ("Quizzes you've published", "Friends you have", …).
 */
export interface AnalyticsWidget {
  /** The widget id; the catalogue uses this for the zero check. */
  id: AnalyticsWidgetId;
  /** The current value for the widget. */
  value: number;
  /** The visible widget name. */
  label: string;
  /**
   * Optional accessible description. When present, surfaced via
   * `aria-describedby` so screen readers announce the value with
   * context.
   */
  description?: string;
}

interface AnalyticsChartProps {
  /** The widget to render. */
  widget: AnalyticsWidget;
}

/**
 * Canonical analytics-widget renderer. Returns `null` for widgets in
 * the zero catalogue (see TKT-6.3.A4) so the UI does not leak
 * absence-as-zero.
 */
export function AnalyticsChart({ widget }: AnalyticsChartProps): ReactElement | null {
  if (isZeroWidget(widget.id)) {
    return null;
  }

  const { id, value, label, description } = widget;
  return (
    <figure
      role="figure"
      data-testid={`analytics-chart-${id}`}
      aria-label={label}
      aria-describedby={description ? `analytics-chart-${id}-desc` : undefined}
      className="flex flex-col gap-1 p-3 rounded-md border border-border"
    >
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
      {description ? (
        <p
          id={`analytics-chart-${id}-desc`}
          className="text-xs text-muted-foreground"
        >
          {description}
        </p>
      ) : null}
    </figure>
  );
}