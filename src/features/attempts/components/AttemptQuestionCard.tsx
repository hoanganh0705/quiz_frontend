"use client";

/**
 * `AttemptQuestionCard` — player-safe question card.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.14.
 *
 * ## What this component owns
 *
 *   - Renders the numbered question text, optional image, the
 *     `<AttemptAnswerPicker />`, the submit action, the submitted
 *     affordance, and the withdrawal action.
 *   - Disables unrelated question cards when per-question pending
 *     state is set on this card.
 *   - Locks the question after a successful submit / hydration
 *     and exposes the withdrawal affordance.
 *
 * ## What this component does NOT own
 *
 *   - No service, SWR, store, or router imports.
 *   - No correctness / score display.
 *
 * The card is composed by `AttemptRunner` (Batch 5) which wires the
 * parent-level mutation callbacks. Every callback here is a prop.
 */

import * as React from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";

import { AttemptAnswerPicker } from "./AttemptAnswerPicker";
import type { AnswerSelection } from "@/features/attempts/types/attempt-runner.types";

import type { QuizQuestionPlayerDto } from "@/lib/api/generated/schemas";

// ─── Public types ────────────────────────────────────────────────────────────

export interface AttemptQuestionCardProps {
  /** Player-safe question DTO. */
  question: QuizQuestionPlayerDto;
  /** 1-based index of this question in the quiz, used for display. */
  index: number;
  /** Total question count, used for display. */
  total: number;
  /** Controlled selection for this question. */
  value: AnswerSelection | null;
  /** Selection change callback. */
  onChange: (selection: AnswerSelection) => void;
  /**
   * Submit handler — invoked when the user clicks the Submit button
   * with a locally valid, unlocked, non-pending selection.
   */
  onSubmit: () => void;
  /**
   * Withdrawal handler — invoked when the user clicks the Withdraw
   * button on a previously-submitted question.
   */
  onWithdraw: () => void;
  /** `true` after a successful submit (locks the picker). */
  isSubmitted: boolean;
  /** `true` while a submit or withdraw mutation is in flight. */
  isPending: boolean;
  /** Optional inline error to render against the picker. */
  errorMessage?: string | null;
  /** The submitted answer's submitted-at ISO timestamp, if any. */
  submittedAt?: string | null;
  /** Optional invalid state (skip-question branch). */
  isQuestionInvalid?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AttemptQuestionCard(
  props: AttemptQuestionCardProps,
): React.ReactElement {
  const {
    question,
    index,
    total,
    value,
    onChange,
    onSubmit,
    onWithdraw,
    isSubmitted,
    isPending,
    errorMessage = null,
    submittedAt = null,
    isQuestionInvalid = false,
  } = props;

  const isLocked = isSubmitted;
  const canSubmit =
    !isLocked &&
    !isPending &&
    value !== null &&
    validateLocalSelection(question, value).isValid;

  return (
    <article
      className={cn(
        "rounded-lg border border-border bg-card p-4 space-y-3 text-card-foreground",
        isQuestionInvalid && "opacity-50",
      )}
      data-testid={`question-card-${question.questionId}`}
      aria-labelledby={`q-${question.questionId}-heading`}
    >
      <header className="flex items-center justify-between gap-2">
        <h3
          id={`q-${question.questionId}-heading`}
          className="text-base font-semibold wrap-break-word"
        >
          <span className="text-muted-foreground mr-2">
            {index}/{total}
          </span>
          {question.text}
        </h3>
      </header>

      {question.imageUrl ? (
        <img
          src={question.imageUrl}
          alt=""
          className="max-h-64 rounded border border-border"
          data-testid={`question-card-${question.questionId}-image`}
        />
      ) : null}

      <AttemptAnswerPicker
        question={question}
        value={value}
        onChange={onChange}
        isLocked={isLocked}
        isPending={isPending}
        errorMessage={errorMessage}
        testIdPrefix={`qc-${question.questionId}`}
      />

      <footer className="flex items-center justify-end gap-2">
        {isSubmitted ? (
          <>
            <span
              className="text-sm text-muted-foreground"
              data-testid={`question-card-${question.questionId}-submitted`}
            >
              {submittedAt
                ? `Submitted ${formatSubmittedAt(submittedAt)}`
                : "Submitted"}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={onWithdraw}
              data-testid={`question-card-${question.questionId}-withdraw`}
            >
              Withdraw
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!canSubmit}
            onClick={onSubmit}
            data-testid={`question-card-${question.questionId}-submit`}
          >
            {isPending ? "Submitting…" : "Submit answer"}
          </Button>
        )}
      </footer>
    </article>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Local validity check used to enable the Submit button without
 * invoking the validation adapter (T-4.14.3). The strict validation
 * still runs at submit time.
 */
function validateLocalSelection(
  question: QuizQuestionPlayerDto,
  selection: AnswerSelection,
): { isValid: boolean } {
  if (selection.questionId !== question.questionId) {
    return { isValid: false };
  }
  if (selection.kind === "multiple_choice") {
    return { isValid: selection.selectedOptionIds.length > 0 };
  }
  if (selection.kind === "true_false") {
    return { isValid: typeof selection.value === "boolean" };
  }
  return { isValid: false };
}

function formatSubmittedAt(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleString();
  } catch {
    return "";
  }
}
