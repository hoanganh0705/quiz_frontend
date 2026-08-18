"use client";

import * as React from "react";

import { cn } from "@/shared/utils/merge-class-names";

export interface AttemptQuestionFeedbackProps {

feedback: string | null;

className?: string;
}

export function AttemptQuestionFeedback(
props: AttemptQuestionFeedbackProps,
): React.ReactElement | null {
const { feedback, className } = props;

if (feedback === null) return null;
const trimmed = feedback.trim();
if (trimmed.length === 0) return null;

return (
<section
className={cn(
"rounded-md border border-border bg-muted/20 p-3 space-y-1",
className,
      )}
aria-labelledby="attempt-question-feedback-heading"
data-testid="attempt-question-feedback"
    >
<h3
id="attempt-question-feedback-heading"
className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
Explanation
      </h3>
<p
className="text-sm text-foreground wrap-break-word"
data-testid="attempt-question-feedback-body"
      >
{trimmed}
</p>
</section>
  );
}