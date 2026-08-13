"use client";

/**
 * `AttemptQuestionCard` — player-safe question card.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.14.
 *
 * Renders the numbered question text, optional image, and the
 * answer picker. Submission is handled silently in the background
 * by the parent `AttemptRunner` component.
 */

import * as React from "react";

import { cn } from "@/shared/utils/merge-class-names";

import { AttemptAnswerPicker } from "./AttemptAnswerPicker";

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
  /** `true` after a successful submit (locks the picker). */
  isSubmitted: boolean;
  /** `true` while a submit or withdraw mutation is in flight. */
  isPending: boolean;
  /** Optional inline error to render against the picker. */
  errorMessage?: string | null;
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
    isSubmitted,
    isPending: _isPending,
    errorMessage = null,
    isQuestionInvalid = false,
  } = props;

  return (
    <article
      className={cn(
        "rounded-lg border p-4 space-y-3",
        isSubmitted
          ? "border-green-200 dark:border-green-900"
          : "border-border",
        isQuestionInvalid && "opacity-50",
      )}
      data-testid={`question-card-${question.questionId}`}
      aria-labelledby={`q-${question.questionId}-heading`}
    >
      <header className="flex items-center justify-between gap-2">
        <h3
          id={`q-${question.questionId}-heading`}
          className="text-base font-medium wrap-break-word"
        >
          <span className="text-muted-foreground mr-2">
            {index}/{total}
          </span>
          {question.questionText}
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
        isLocked={isSubmitted}
        isPending={false}
        errorMessage={errorMessage}
        testIdPrefix={`qc-${question.questionId}`}
      />
    </article>
  );
}
