"use client";

/**
 * `AttemptBreakdown` — per-question score breakdown list.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.9.
 *
 * ## What this component owns
 *
 *   - Renders one row per question in the completed-attempt review
 *     projection, showing:
 *       - the question position / total (`1/5`),
 *       - the prompt text (verbatim from the server),
 *       - a correctness marker (`Correct` / `Incorrect` / `Skipped` /
 *         `Pending`),
 *       - the user's selected option id (if any),
 *       - the correct-option ids (if the DTO exposes them).
 *   - Renders an empty-state placeholder when the breakdown array
 *     is empty.
 *
 * ## What this component does NOT own
 *
 *   - No service, store, hook, or router imports.
 *   - No client-side scoring or correctness inference. The marker
 *     is derived exclusively from the verified
 *     `AttemptReviewQuestionDto.isCorrect` field plus the option
 *     flags in `answerOptions`.
 *   - No feedback rendering — `AttemptQuestionFeedback` (T-4.15.10)
 *     owns the per-question feedback block.
 *
 * The player-DTO invariant (Story 4.10) is preserved: this component
 * ONLY renders against the post-completion review projection, which
 * is the canonical source of correctness metadata.
 */

import * as React from "react";

import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListChecksIcon } from "lucide-react";
import { cn } from "@/shared/utils/merge-class-names";

import type { AttemptQuestionScoreDto } from "@/features/attempts/types/attempt-result.types";

// ─── Public types ────────────────────────────────────────────────────────────

export interface AttemptBreakdownProps {
  /** Verified per-question review projection. */
  questions: readonly AttemptQuestionScoreDto[];
  /** Total question count. Used for the `position/total` display. */
  total: number;
  /** Optional class name applied to the section root. */
  className?: string;
}

// ─── Correctness derivation ──────────────────────────────────────────────────

/**
 * Discriminated correctness label derived from the verified DTO.
 *
 *   - `'correct'`   — the user picked a correct option.
 *   - `'incorrect'` — the user picked an incorrect option.
 *   - `'skipped'`   — the user did not select any option.
 *   - `'pending'`   — the server has not yet scored the question.
 *
 * The label is derived exclusively from the DTO fields; no
 * client-side answer-key inference is performed.
 */
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
  // The backend exposes `isCorrect` as a free-form nullable object.
  // The narrow cast below reads the boolean indicator the runtime
  // payload carries — never infer or recompute from answer options.
  const indicator = (q.isCorrect as { value?: unknown }).value;
  if (indicator === true) return "correct";
  if (indicator === false) return "incorrect";
  return "pending";
}

// ─── Component ───────────────────────────────────────────────────────────────

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

// ─── Row ─────────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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