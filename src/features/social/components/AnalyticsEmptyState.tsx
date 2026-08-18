"use client";

import { type ReactElement } from "react";

import type { AnalyticsPeriod } from "@/features/social/types/analytics";

export type AnalyticsEmptyKind = "my-analytics" | "stats" | "leaderboard";

interface AnalyticsEmptyStateProps {

kind: AnalyticsEmptyKind;

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