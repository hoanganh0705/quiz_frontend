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
"rounded-xl border border-border/70 bg-card/60 p-4 space-y-1.5 backdrop-blur-xs",
className,
      )}
aria-labelledby="attempt-question-feedback-heading"
data-testid="attempt-question-feedback"
    >
<h3
id="attempt-question-feedback-heading"
className="text-xs font-semibold uppercase tracking-wider text-primary/80"
      >
Explanation
      </h3>
<p
className="text-sm text-foreground leading-relaxed wrap-break-word"
data-testid="attempt-question-feedback-body"
      >
{trimmed}
</p>
</section>
  );
}