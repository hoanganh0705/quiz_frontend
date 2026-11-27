"use client";

import { useCallback } from "react";

import {
  useQuestionRevealed,
  useSubmitInstanceAnswer,
} from "@/features/instances/play/hooks";

import { cn } from "@/shared/utils/merge-class-names";

import type { UseQuestionRevealedResult } from "@/features/instances/play/hooks";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

interface AnswerOptionsProps {
  instanceId: string;
  className?: string;
}

export function AnswerOptions({ instanceId, className }: AnswerOptionsProps) {
  const { bundle }: UseQuestionRevealedResult = useQuestionRevealed(instanceId);
  const questionId = bundle?.question.id ?? null;

  const { submit, selectedOptionId, canSubmit, lastError } =
    useSubmitInstanceAnswer(instanceId, questionId);

  const handleOptionClick = useCallback(
    (optionId: string) => {
      if (!canSubmit) return;
      void submit(optionId);
    },
    [canSubmit, submit],
  );

  if (!bundle || bundle.options.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className="grid grid-cols-1 gap-2.5"
        data-testid="answer-options"
        role="radiogroup"
        aria-label="Answer options"
      >
        {bundle.options.map((option, idx) => {
          const isSelected = selectedOptionId === option.id;
          const letter = OPTION_LETTERS[idx] ?? `${idx + 1}`;
          const isDisabled = !canSubmit;

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={isDisabled}
              onClick={() => handleOptionClick(option.id)}
              className={cn(
                "flex w-full items-center gap-3.5 rounded-xl border p-3.5 sm:p-4 text-left transition-all select-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "border-brand bg-brand/10 shadow-xs ring-1 ring-brand/40"
                  : "border-border/80 bg-card hover:border-brand/40 hover:bg-muted/40",
                isDisabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
              )}
              data-testid="option-row"
              data-option-id={option.id}
              data-option-index={option.index}
            >
              {/* Radio indicator */}
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isSelected
                    ? "border-brand bg-brand"
                    : "border-muted-foreground/40 bg-background",
                )}
                aria-hidden="true"
              >
                {isSelected ? (
                  <span className="size-1.5 rounded-full bg-white" />
                ) : null}
              </span>

              {/* Letter badge (matches AttemptAnswerPicker) */}
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-semibold transition-colors",
                  isSelected
                    ? "border-brand bg-brand text-white"
                    : "border-border bg-muted text-muted-foreground",
                )}
                aria-hidden="true"
              >
                {letter}
              </span>

              {/* Option content */}
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-sm sm:text-base text-foreground leading-snug wrap-break-word">
                  {option.text}
                </span>
                {option.mediaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={option.mediaUrl}
                    alt=""
                    className="mt-2 w-full max-h-32 object-contain rounded-lg"
                    data-testid="option-media"
                  />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {lastError ? (
        <p className="text-sm text-destructive" role="alert">
          {lastError.message || "Could not record answer. Please try again."}
        </p>
      ) : null}
    </div>
  );
}
