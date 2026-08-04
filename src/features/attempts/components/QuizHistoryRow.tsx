"use client";

/**
 * `QuizHistoryRow` — one attempt row in the history list.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.17.
 *
 * ## What this component owns
 *
 *   - Renders the quiz title, completion timestamp, score percent, XP
 *     earned, and a status badge for a single attempt summary.
 *   - Renders a stable link to the canonical detail page
 *     (`/quiz-history/[attemptId]`).
 *   - Renders nothing when the summary is missing the attempt identity
 *     (defensive guard for a malformed row).
 *
 * ## What this component does NOT own
 *
 *   - No service, store, hook, or router imports.
 *   - No mutation; the row is read-only.
 *
 * The row is composed by `QuizHistoryList` (T-4.15.19) and
 * `QuizHistoryPage` (T-4.15.20). The detail link preserves the
 * attempt identity so deep-linking into the history is stable.
 */

import * as React from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/shared/utils/merge-class-names";

import type { AttemptHistoryRow } from "@/features/attempts/types/attempt-history.types";

// ─── Public types ────────────────────────────────────────────────────────────

export interface QuizHistoryRowProps {
  /** Attempt history row. */
  row: AttemptHistoryRow;
  /** Optional class name applied to the row root. */
  className?: string;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge(
  props: { status: AttemptHistoryRow["status"] },
): React.ReactElement {
  const { status } = props;
  switch (status) {
    case "completed":
      return (
        <Badge variant="default" data-testid="quiz-history-row-status">
          Completed
        </Badge>
      );
    case "abandoned":
      return (
        <Badge variant="secondary" data-testid="quiz-history-row-status">
          Abandoned
        </Badge>
      );
    case "started":
    default:
      return (
        <Badge variant="outline" data-testid="quiz-history-row-status">
          In progress
        </Badge>
      );
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function QuizHistoryRow(
  props: QuizHistoryRowProps,
): React.ReactElement | null {
  const { row, className } = props;

  // Defensive: a row without an attemptId has no stable link target.
  if (!row.attemptId) return null;

  const detailHref = `/quiz-history/${encodeURIComponent(row.attemptId)}`;

  const hasScore =
    typeof row.scorePercent === "number" && row.scorePercent !== null;

  return (
    <li
      className={cn(
        "flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4",
        className,
      )}
      data-testid="quiz-history-row"
    >
      {/* Left column: title + metadata */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-baseline gap-2">
          <Link
            href={detailHref}
            className="text-sm font-medium text-foreground hover:underline wrap-break-word truncate"
            data-testid="quiz-history-row-title-link"
          >
            {row.quizTitle}
          </Link>
          <StatusBadge status={row.status} />
        </div>

        <p
          className="text-xs text-muted-foreground"
          data-testid="quiz-history-row-finished-at"
        >
          {row.status !== "started"
            ? formatFinishedAt(row.finishedAt)
            : formatStartedAt(row.startedAt)}
        </p>
      </div>

      {/* Right column: score + XP */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        {hasScore ? (
          <span
            className="text-sm font-semibold tabular-nums"
            data-testid="quiz-history-row-score"
          >
            {Math.round(row.scorePercent!)}%
          </span>
        ) : (
          <span
            className="text-sm text-muted-foreground tabular-nums"
            data-testid="quiz-history-row-score"
          >
            —
          </span>
        )}
        {row.xpEarned > 0 ? (
          <span
            className="text-xs text-muted-foreground"
            data-testid="quiz-history-row-xp"
          >
            +{row.xpEarned} XP
          </span>
        ) : null}
      </div>
    </li>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFinishedAt(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    return `Completed ${date.toLocaleDateString()}`;
  } catch {
    return "";
  }
}

function formatStartedAt(iso: string): string {
  try {
    const date = new Date(iso);
    return `Started ${date.toLocaleDateString()}`;
  } catch {
    return "";
  }
}
