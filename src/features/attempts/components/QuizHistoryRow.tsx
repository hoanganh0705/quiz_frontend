"use client";

import Link from "next/link";
import * as React from "react";

import { ChevronRightIcon } from "lucide-react";

import { Badge } from "@/components/ui/Badge";

import { cn } from "@/shared/utils/merge-class-names";

import type { AttemptHistoryRow } from "@/features/attempts/types/attempt-history.types";

export interface QuizHistoryRowProps {
  row: AttemptHistoryRow;

  className?: string;
}

function StatusBadge(props: {
  status: AttemptHistoryRow["status"];
}): React.ReactElement {
  const { status } = props;
  switch (status) {
    case "completed":
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
          data-testid="quiz-history-row-status"
        >
          Completed
        </Badge>
      );
    case "abandoned":
      return (
        <Badge
          variant="outline"
          className="border-border bg-muted text-muted-foreground"
          data-testid="quiz-history-row-status"
        >
          Abandoned
        </Badge>
      );
    case "started":
    default:
      return (
        <Badge
          variant="outline"
          className="border-brand/30 bg-brand/10 text-brand dark:bg-brand/20"
          data-testid="quiz-history-row-status"
        >
          In progress
        </Badge>
      );
  }
}

function DifficultyBadge(props: {
  difficulty: string | null | undefined;
}): React.ReactElement | null {
  const normalized = props.difficulty?.trim().toLowerCase();
  if (normalized === "easy") {
    return <Badge variant="difficulty-easy">Easy</Badge>;
  }
  if (normalized === "medium") {
    return <Badge variant="difficulty-medium">Medium</Badge>;
  }
  if (normalized === "hard") {
    return <Badge variant="difficulty-hard">Hard</Badge>;
  }
  return null;
}

function getScoreToneClass(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-foreground";
  return "text-amber-600 dark:text-amber-400";
}

function formatDateLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatAttemptTimestamp(row: AttemptHistoryRow): string {
  if (row.status === "completed") {
    const finished = formatDateLabel(row.finishedAt);
    if (finished) return `Completed ${finished}`;
    const started = formatDateLabel(row.startedAt);
    return started ? `Started ${started}` : "";
  }

  if (row.status === "abandoned") {
    const timestamp = formatDateLabel(row.finishedAt ?? row.startedAt);
    return timestamp ? `Abandoned ${timestamp}` : "";
  }

  const started = formatDateLabel(row.startedAt);
  return started ? `Started ${started}` : "";
}

export function QuizHistoryRow(
  props: QuizHistoryRowProps,
): React.ReactElement | null {
  const { row, className } = props;

  if (!row.attemptId) return null;

  const detailHref = `/quiz-history/${encodeURIComponent(row.attemptId)}`;

  const hasScore =
    typeof row.scorePercent === "number" && !Number.isNaN(row.scorePercent);
  const roundedScore = hasScore ? Math.round(row.scorePercent!) : null;
  const timestampText = formatAttemptTimestamp(row);
  const hasCorrectCount =
    typeof row.correctCount === "number" && row.correctCount >= 0;

  return (
    <li
      className={cn(
        "group relative flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40 focus-within:bg-muted/40",
        className,
      )}
      data-testid="quiz-history-row"
    >
      {/* Left column: title + badges + metadata */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Link
            href={detailHref}
            className={cn(
              "min-w-0 max-w-full truncate text-sm sm:text-base font-semibold text-foreground transition-colors group-hover:text-brand",
              "focus-visible:outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring",
            )}
            data-testid="quiz-history-row-title-link"
          >
            {row.quizTitle}
          </Link>
          <StatusBadge status={row.status} />
          <DifficultyBadge difficulty={row.difficulty} />
        </div>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground">
          {timestampText ? (
            <p data-testid="quiz-history-row-finished-at">{timestampText}</p>
          ) : (
            <p data-testid="quiz-history-row-finished-at" />
          )}
          {hasCorrectCount ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {row.correctCount} correct
              </span>
            </>
          ) : null}
        </div>
      </div>

      {/* Right column: score + XP + chevron */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex flex-col items-end gap-0.5">
          {roundedScore !== null ? (
            <span
              className={cn(
                "font-mono text-base sm:text-lg font-bold tabular-nums leading-tight",
                getScoreToneClass(roundedScore),
              )}
              data-testid="quiz-history-row-score"
            >
              {roundedScore}%
            </span>
          ) : (
            <span
              className="font-mono text-base sm:text-lg font-semibold tabular-nums leading-tight text-muted-foreground"
              data-testid="quiz-history-row-score"
            >
              —
            </span>
          )}
          {row.xpEarned > 0 ? (
            <span
              className="font-mono text-xs font-medium tabular-nums text-brand"
              data-testid="quiz-history-row-xp"
            >
              +{row.xpEarned} XP
            </span>
          ) : null}
        </div>
        <ChevronRightIcon
          className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground"
          aria-hidden="true"
        />
      </div>
    </li>
  );
}
