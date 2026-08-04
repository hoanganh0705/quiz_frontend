"use client";

/**
 * `AttemptQuestionFeedback` — per-question feedback block.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.10.
 *
 * ## What this component owns
 *
 *   - Renders the per-question feedback text the
 *     `AttemptReviewQuestionDto.explanation` field exposes (when
 *     present) in an accessible block adjacent to the breakdown row.
 *   - Renders nothing when the feedback field is missing, empty,
 *     or null — the parent page decides what to render.
 *
 * ## What this component does NOT own
 *
 *   - No service, store, hook, or router imports.
 *   - No client-side inference of feedback text. The text is
 *     rendered verbatim from the server.
 *
 * The player-DTO invariant (Story 4.10) is preserved: feedback
 * text is shown only against the post-completion review projection
 * (the canonical source).
 */

import * as React from "react";

import { cn } from "@/shared/utils/merge-class-names";

// ─── Public types ────────────────────────────────────────────────────────────

export interface AttemptQuestionFeedbackProps {
  /**
   * Verified explanation / rationale text from
   * `AttemptReviewQuestionDto.explanation`. Pass `null` or an empty
   * string to render nothing.
   */
  feedback: string | null;
  /** Optional class name applied to the section root. */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

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