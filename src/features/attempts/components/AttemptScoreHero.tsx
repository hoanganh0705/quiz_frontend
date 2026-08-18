"use client";

import * as React from "react";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/shared/utils/merge-class-names";

import type { AttemptScoreSummaryDto } from "@/features/attempts/types/attempt-result.types";

export interface AttemptScoreHeroProps {

summary: AttemptScoreSummaryDto | null;

className?: string;
}

export function AttemptScoreHero(
props: AttemptScoreHeroProps,
): React.ReactElement | null {
const { summary, className } = props;

if (summary === null) return null;

const { correctCount, totalQuestions, scorePercent, finishedAt } = summary;
const hasScore = scorePercent !== null && correctCount !== null;

return (
<section
className={cn(
"rounded-lg border border-border bg-card p-4 text-card-foreground space-y-3",
className,
      )}
aria-labelledby="attempt-score-hero-heading"
data-testid="attempt-score-hero"
    >
<header className="flex items-baseline justify-between gap-3">
<h2
id="attempt-score-hero-heading"
className="text-base font-semibold wrap-break-word"
        >
Your score
        </h2>
<span
className="text-xs text-muted-foreground"
data-testid="attempt-score-hero-finished-at"
        >
{formatFinishedAt(finishedAt)}
</span>
</header>

<div className="flex items-center gap-3">
<span
className="text-3xl font-bold tabular-nums"
data-testid="attempt-score-hero-correct"
        >
{hasScore ? `${correctCount}/${totalQuestions}` : "—"}
</span>
<span className="text-sm text-muted-foreground">correct</span>
<Badge
variant={
hasScore && scorePercent !== null && scorePercent >= 60
? "default"
: "secondary"
          }
className="ml-auto"
data-testid="attempt-score-hero-percent"
        >
{hasScore && scorePercent !== null
? `${Math.round(scorePercent)}%`
: "Pending"}
</Badge>
</div>
</section>
  );
}

function formatFinishedAt(iso: string): string {
try {
const date = new Date(iso);
return date.toLocaleString();
  } catch {
return "";
  }
}