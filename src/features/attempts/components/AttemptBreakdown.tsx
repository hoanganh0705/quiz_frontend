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
  "correct" | "incorrect" | "skipped" | "pending";

function extractIsCorrect(raw: unknown): boolean | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "object") {
    if (
      "value" in raw &&
      typeof (raw as { value: unknown }).value === "boolean"
    ) {
      return (raw as { value: boolean }).value;
    }
    if (
      "correct" in raw &&
      typeof (raw as { correct: unknown }).correct === "boolean"
    ) {
      return (raw as { correct: boolean }).correct;
    }
  }
  return null;
}

export function markerForQuestion(
  q: AttemptQuestionScoreDto,
): AttemptBreakdownMarker {
  if (q.selectedOptionId === null) return "skipped";

  const isCorrect = extractIsCorrect(q.isCorrect);
  if (isCorrect === true) return "correct";
  if (isCorrect === false) return "incorrect";
  return "pending";
}

export function AttemptBreakdown(
  props: AttemptBreakdownProps,
): React.ReactElement {
  const { questions, total, className } = props;

  if (questions.length === 0) {
    return (
      <section
        className={cn(
          "rounded-xl border border-border/70 bg-card/75 p-6 shadow-xs backdrop-blur-sm",
          className,
        )}
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
        "rounded-xl border border-border/70 bg-card/75 p-5 sm:p-6 shadow-xs backdrop-blur-sm space-y-4",
        className,
      )}
      aria-labelledby="attempt-breakdown-heading"
      data-testid="attempt-breakdown"
    >
      <div className="flex items-center justify-between">
        <h2
          id="attempt-breakdown-heading"
          className="text-base font-semibold tracking-tight"
        >
          Question breakdown
        </h2>
        <span className="text-xs font-mono text-muted-foreground tabular-nums">
          {questions.length} questions reviewed
        </span>
      </div>
      <ol className="space-y-3" data-testid="attempt-breakdown-list">
        {questions.map((q) => (
          <BreakdownRow key={q.questionId} question={q} total={total} />
        ))}
      </ol>
    </section>
  );
}

function BreakdownRow(props: {
  question: AttemptQuestionScoreDto;
  total: number;
}): React.ReactElement {
  const { question: q, total } = props;
  const marker = markerForQuestion(q);

  return (
    <li
      className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-3 transition-colors hover:bg-muted/30"
      data-testid={`attempt-breakdown-row-${q.questionId}`}
      aria-labelledby={`attempt-breakdown-row-${q.questionId}-prompt`}
    >
      <header className="flex items-baseline justify-between gap-3">
        <span
          id={`attempt-breakdown-row-${q.questionId}-prompt`}
          className="text-sm font-medium wrap-break-word leading-relaxed"
        >
          <span className="text-xs font-mono font-semibold text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded mr-2 tabular-nums">
            {q.position}/{total}
          </span>
          {q.questionText}
        </span>
        <BreakdownMarkerBadge marker={marker} />
      </header>

      <dl className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2 pt-1 border-t border-border/40">
        <div className="flex items-center gap-2">
          <dt className="font-medium text-foreground">Your answer:</dt>
          <dd
            className="font-mono text-xs"
            data-testid={`attempt-breakdown-row-${q.questionId}-selected`}
          >
            {formatSelectedOption(q.selectedOptionId, q.answerOptions)}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="font-medium text-foreground">Correct option:</dt>
          <dd
            className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-medium"
            data-testid={`attempt-breakdown-row-${q.questionId}-correct`}
          >
            {formatCorrectOptions(q.answerOptions)}
          </dd>
        </div>
      </dl>
      {q.explanation ? (
        <div className="mt-2.5 rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground border border-border/40">
          <span className="font-semibold text-foreground">Explanation: </span>
          {q.explanation}
        </div>
      ) : null}
    </li>
  );
}

function BreakdownMarkerBadge(props: {
  marker: AttemptBreakdownMarker;
}): React.ReactElement {
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
          Undone
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

function formatSelectedOption(
  id: string | null,
  options?: readonly { optionId: string; value?: string }[],
): React.ReactNode {
  if (id === null) return "—";
  const matched = options?.find((opt) => opt.optionId === id);
  if (matched?.value) {
    return (
      <span>
        <span className="font-sans font-medium text-foreground">
          {matched.value}
        </span>
        <span className="text-xs font-mono text-muted-foreground/60 ml-1.5">
          ({id})
        </span>
      </span>
    );
  }
  return id;
}

function formatCorrectOptions(
  options: readonly { optionId: string; value?: string; isCorrect: boolean }[],
): React.ReactNode {
  const correct = options.filter((opt) => opt.isCorrect === true);
  if (correct.length === 0) return "—";

  const values = correct.map((opt) => opt.value).filter(Boolean);
  const ids = correct.map((opt) => opt.optionId).join(", ");

  if (values.length > 0) {
    return (
      <span>
        <span className="font-sans font-medium text-emerald-600 dark:text-emerald-400">
          {values.join(", ")}
        </span>
        <span className="text-xs font-mono text-muted-foreground/60 ml-1.5">
          ({ids})
        </span>
      </span>
    );
  }
  return ids;
}
