"use client";

import * as React from "react";
import { Trophy, CheckCircle2, Zap, Sparkles } from "lucide-react";

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

  const { correctCount, totalQuestions, scorePercent, finishedAt, xpEarned } = summary;
  const hasScore = scorePercent !== null && correctCount !== null;
  const isPassing = hasScore && scorePercent !== null && scorePercent >= 60;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-card/90 p-6 text-card-foreground shadow-md space-y-5",
        className,
      )}
      aria-labelledby="attempt-score-hero-heading"
      data-testid="attempt-score-hero"
    >
      <div
        className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-brand/15 blur-2xl motion-reduce:hidden"
        aria-hidden="true"
      />

      <header className="flex items-baseline justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex size-8 items-center justify-center rounded-lg border",
            isPassing ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "bg-brand/10 border-brand/30 text-brand"
          )}>
            {isPassing ? <Trophy className="size-4" /> : <CheckCircle2 className="size-4" />}
          </div>
          <h2
            id="attempt-score-hero-heading"
            className="text-base sm:text-lg font-bold wrap-break-word text-foreground"
          >
            Your score
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {typeof xpEarned === "number" && xpEarned > 0 && (
            <div
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 text-xs font-mono font-semibold text-amber-600 dark:text-amber-400"
              data-testid="attempt-score-hero-xp"
            >
              <Zap className="size-3 fill-amber-500/30 text-amber-500" />
              <span>+{xpEarned} XP</span>
            </div>
          )}
          <span
            className="text-xs font-mono text-muted-foreground"
            data-testid="attempt-score-hero-finished-at"
          >
            {formatFinishedAt(finishedAt)}
          </span>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 relative z-10 pt-1">
        <div className="flex items-baseline gap-2.5">
          <span
            className="text-4xl sm:text-5xl font-extrabold font-mono tracking-tight text-foreground"
            data-testid="attempt-score-hero-correct"
          >
            {hasScore ? `${correctCount}/${totalQuestions}` : "—"}
          </span>
          <span className="text-sm font-medium text-muted-foreground">correct answers</span>
        </div>

        <Badge
          variant={isPassing ? "default" : "secondary"}
          className={cn(
            "text-base sm:text-lg font-mono font-bold px-3.5 py-1 rounded-xl shadow-xs",
            isPassing && "bg-brand text-brand-foreground hover:bg-brand"
          )}
          data-testid="attempt-score-hero-percent"
        >
          {hasScore && scorePercent !== null
            ? `${Math.round(scorePercent)}%`
            : "Pending"}
        </Badge>
      </div>

      {isPassing && (
        <div
          className="relative z-10 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 text-xs text-emerald-800 dark:text-emerald-300"
          data-testid="attempt-score-hero-celebration"
        >
          <Sparkles className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="font-medium">
            Quiz Passed! Great performance on this challenge.
          </span>
        </div>
      )}
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
