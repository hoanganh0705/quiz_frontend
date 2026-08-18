"use client";

import { type ReactElement } from "react";

import { usePeriodFilter } from "@/features/social/hooks/usePeriodFilter";
import {
ANALYTICS_PERIOD_LABELS,
type AnalyticsPeriod,
} from "@/features/social/types/analytics";

interface AnalyticsPeriodFilterProps {

labels?: Partial<Record<AnalyticsPeriod, string>>;
}

const PERIODS: readonly AnalyticsPeriod[] = ["week", "month", "all"];

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