"use client";

/**
 * `AttemptScoreHero` — headline score block for the attempt-result page.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.8.
 *
 * ## What this component owns
 *
 *   - Renders the headline score (X/Y correct), the percent score,
 *     and the completion timestamp from the verified
 *     `AttemptScoreSummaryDto` projection (T-4.15.2).
 *   - Renders a placeholder row when the projection is in the
 *     "score pending" branch (`scorePercent: null`) so the hero is
 *     never empty mid-load.
 *   - Renders nothing when the summary is absent (the parent page
 *     decides what to render — typically the loading skeleton).
 *
 * ## What this component does NOT own
 *
 *   - No service, store, hook, or router imports.
 *   - No correctness display beyond the verified server projection
 *     (Story 4.10 player-DTO invariant).
 *   - No mutation; the score is read-only.
 *
 * The hero block is composed by `AttemptResultPage` (T-4.15.12) and
 * never renders the breakdown or the feedback list (those are
 * dedicated components — T-4.15.9 / T-4.15.10).
 */

import * as React from "react";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/shared/utils/merge-class-names";

import type { AttemptScoreSummaryDto } from "@/features/attempts/types/attempt-result.types";

// ─── Public types ────────────────────────────────────────────────────────────

export interface AttemptScoreHeroProps {
  /** The verified score summary projection. */
  summary: AttemptScoreSummaryDto | null;
  /**
   * Optional class name applied to the section root so the result
   * page can place the hero in a wider / narrower grid.
   */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFinishedAt(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleString();
  } catch {
    return "";
  }
}