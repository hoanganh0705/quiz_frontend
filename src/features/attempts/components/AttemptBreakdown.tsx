"use client";

import * as React from "react";

import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListChecksIcon } from "lucide-react";
import { cn } from "@/shared/utils/merge-class-names";

import type { AttemptQuestionScoreDto } from "@/features/attempts/types/attempt-result.types";

export interface AttemptBreakdownProps {

questions: readonly AttemptQuestionScoreDto[];

total: number;

className?: string;
}

export type AttemptBreakdownMarker =
| "correct"
  | "incorrect"
  | "skipped"
  | "pending";

export function markerForQuestion(
q: AttemptQuestionScoreDto,
): AttemptBreakdownMarker {
if (q.isCorrect === null) return "pending";
if (q.selectedOptionId === null) return "skipped";

const indicator = (q.isCorrect as { value?: unknown }).value;
if (indicator === true) return "correct";
if (indicator === false) return "incorrect";
return "pending";
}

export function AttemptBreakdown(
props: AttemptBreakdownProps,
): React.ReactElement {
const { questions, total, className } = props;

if (questions.length === 0) {
return (
<section
className={cn("rounded-lg border border-border bg-card", className)}
aria-labelledby="attempt-breakdown-heading"
data-testid="attempt-breakdown-empty"
      >
<EmptyState
icon={ListChecksIcon}
title="No questions yet"
description="The review projection for this attempt is empty."
size="sm"
        />
</section>
    );
  }

return (
<section
className={cn(
"rounded-lg border border-border bg-card p-4 space-y-3",
className,
      )}
aria-labelledby="attempt-breakdown-heading"
data-testid="attempt-breakdown"
    >
<h2 id="attempt-breakdown-heading" className="text-base font-semibold">
Question breakdown
      </h2>
<ol className="space-y-3" data-testid="attempt-breakdown-list">
{questions.map((q) => (
<BreakdownRow key={q.questionId} question={q} total={total} />
        ))}
</ol>
</section>
  );
}

function BreakdownRow(
props: { question: AttemptQuestionScoreDto; total: number },
): React.ReactElement {
const { question: q, total } = props;
const marker = markerForQuestion(q);

return (
<li
className="rounded-md border border-border bg-muted/30 p-3 space-y-2"
data-testid={`attempt-breakdown-row-${q.questionId}`}
aria-labelledby={`attempt-breakdown-row-${q.questionId}-prompt`}
    >
<header className="flex items-baseline justify-between gap-3">
<span
id={`attempt-breakdown-row-${q.questionId}-prompt`}
className="text-sm font-medium wrap-break-word"
        >
<span className="text-muted-foreground mr-2">
{q.position}/{total}
</span>
{q.questionText}
</span>
<BreakdownMarkerBadge marker={marker} />
</header>

<dl className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
<div className="flex items-center gap-2">
<dt className="font-medium text-foreground">Your answer</dt>
<dd data-testid={`attempt-breakdown-row-${q.questionId}-selected`}>
{formatSelectedOption(q.selectedOptionId)}
</dd>
</div>
<div className="flex items-center gap-2">
<dt className="font-medium text-foreground">Correct option</dt>
<dd data-testid={`attempt-breakdown-row-${q.questionId}-correct`}>
{formatCorrectOptions(q.answerOptions)}
</dd>
</div>
</dl>
</li>
  );
}

function BreakdownMarkerBadge(
props: { marker: AttemptBreakdownMarker },
): React.ReactElement {
const { marker } = props;
switch (marker) {
case "correct":
return (
<Badge variant="default" data-testid="attempt-breakdown-marker-correct">
Correct
        </Badge>
      );
case "incorrect":
return (
<Badge
variant="destructive"
data-testid="attempt-breakdown-marker-incorrect"
        >
Incorrect
        </Badge>
      );
case "skipped":
return (
<Badge
variant="secondary"
data-testid="attempt-breakdown-marker-skipped"
        >
Skipped
        </Badge>
      );
case "pending":
default:
return (
<Badge variant="outline" data-testid="attempt-breakdown-marker-pending">
Pending
        </Badge>
      );
  }
}

function formatSelectedOption(id: string | null): string {
if (id === null) return "—";
return id;
}

function formatCorrectOptions(
options: readonly { optionId: string; isCorrect: boolean }[],
): string {
const correctIds = options
    .filter((opt) => opt.isCorrect === true)
    .map((opt) => opt.optionId);
if (correctIds.length === 0) return "—";
return correctIds.join(", ");
}