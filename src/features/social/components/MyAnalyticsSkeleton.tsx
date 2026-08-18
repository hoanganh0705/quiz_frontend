"use client";

import { type ReactElement } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

const DEFAULT_WIDGET_COUNT = 6;

interface MyAnalyticsSkeletonProps {

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