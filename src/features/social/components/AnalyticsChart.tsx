"use client";

import { type ReactElement } from "react";

import {
type AnalyticsWidgetId,
isZeroWidget,
} from "@/features/social/analytics-zero-widget-catalog";

export interface AnalyticsWidget {

id: AnalyticsWidgetId;

value: number;

label: string;

description?: string;
}

interface AnalyticsChartProps {

widget: AnalyticsWidget;
}

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