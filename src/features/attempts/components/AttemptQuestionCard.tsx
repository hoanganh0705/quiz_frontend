"use client";

import * as React from "react";

import { cn } from "@/shared/utils/merge-class-names";

import { AttemptAnswerPicker } from "./AttemptAnswerPicker";
import type { AnswerSelection } from "../types";

import type { QuizQuestionPlayerDto } from "@/lib/api/generated/schemas";

export interface AttemptQuestionCardProps {
  question: QuizQuestionPlayerDto;
  index: number;
  total: number;
  value: AnswerSelection | null;
  onChange: (selection: AnswerSelection) => void;
  isSubmitted: boolean;
  isPending: boolean;
  errorMessage?: string | null;
  isQuestionInvalid?: boolean;
}

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
    errorMessage = null,
    isQuestionInvalid = false,
  } = props;

  return (
    <article
      className={cn(
        "rounded-2xl border p-5 sm:p-7 space-y-5 bg-card text-card-foreground shadow-sm transition-all",
        isSubmitted
          ? "border-emerald-500/40 bg-emerald-500/5 dark:border-emerald-500/30"
          : "border-border/80",
        isQuestionInvalid && "opacity-50",
      )}
      id={`question-card-${question.questionId}`}
      data-testid={`question-card-${question.questionId}`}
      aria-labelledby={`q-${question.questionId}-heading`}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-brand/10 text-brand font-mono text-xs font-semibold">
            <span>Question</span>
            <span>
              {index}/{total}
            </span>
          </span>
          {isSubmitted && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-medium">
              Answered
            </span>
          )}
        </div>
      </header>

      <h3
        id={`q-${question.questionId}-heading`}
        className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-snug wrap-break-word"
      >
        {question.questionText}
      </h3>

      {question.imageUrl ? (
        <div className="relative overflow-hidden rounded-xl border border-border/80 max-h-72">
          <img
            src={question.imageUrl}
            alt=""
            className="w-full h-auto object-cover max-h-72"
            data-testid={`question-card-${question.questionId}-image`}
          />
        </div>
      ) : null}

      <AttemptAnswerPicker
        question={question}
        value={value}
        onChange={onChange}
        isLocked={isQuestionInvalid}
        isPending={false}
        errorMessage={errorMessage}
        testIdPrefix={`qc-${question.questionId}`}
      />

      {!isSubmitted && value !== null ? (
        <p className="text-xs text-muted-foreground pt-1">
          Your answer will be submitted when you complete the quiz.
        </p>
      ) : null}
    </article>
  );
}
