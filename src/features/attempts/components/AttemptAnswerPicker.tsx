"use client";

import * as React from "react";

import { Label } from "@/components/ui/Label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/RadioGroup";
import { cn } from "@/shared/utils/merge-class-names";

import { deriveQuestionKind } from "@/features/attempts/lib/attempt-answer-validation";
import type { AnswerSelection } from "@/features/attempts/types/attempt-runner.types";

import type { QuizQuestionPlayerDto } from "@/lib/api/generated/schemas";

export interface AttemptAnswerPickerProps {
  question: QuizQuestionPlayerDto;
  value: AnswerSelection | null;
  onChange: (selection: AnswerSelection) => void;
  isLocked?: boolean;
  isPending?: boolean;
  errorMessage?: string | null;
  testIdPrefix?: string;
}

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export function AttemptAnswerPicker(
  props: AttemptAnswerPickerProps,
): React.ReactElement {
  const {
    question,
    value,
    onChange,
    isLocked = false,
    isPending = false,
    errorMessage = null,
    testIdPrefix,
  } = props;

  const kind = deriveQuestionKind(question);
  const disabled = isLocked || isPending;
  const errorId = React.useId();
  const groupId = React.useId();

  if (kind === "true_false") {
    const trueOption = question.answerOptions.find(
      (o) => typeof o.value === "string" && o.value.toLowerCase() === "true",
    );
    const falseOption = question.answerOptions.find(
      (o) => typeof o.value === "string" && o.value.toLowerCase() === "false",
    );

    if (!trueOption || !falseOption) {
      return (
        <p
          className="text-sm text-muted-foreground"
          data-testid={testIdPrefix ? `${testIdPrefix}-malformed` : undefined}
        >
          This question cannot be answered.
        </p>
      );
    }

    const currentValue =
      value?.kind === "true_false" && value.questionId === question.questionId
        ? value.value
          ? "true"
          : "false"
        : "";

    return (
      <div
        className="space-y-3"
        data-testid={testIdPrefix ? `${testIdPrefix}-root` : undefined}
      >
        <RadioGroup
          id={groupId}
          value={currentValue}
          disabled={disabled}
          onValueChange={(next) => {
            if (disabled) return;
            const boolValue = next === "true";
            onChange({
              kind: "true_false",
              questionId: question.questionId,
              value: boolValue,
            });
          }}
          aria-describedby={errorMessage ? errorId : undefined}
          aria-invalid={errorMessage ? true : undefined}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {[trueOption, falseOption].filter(Boolean).map((option, idx) => {
            const optionValue = option!.value ?? "";
            const isSelected = currentValue === optionValue.toLowerCase();
            const badgeLetter = idx === 0 ? "T" : "F";

            return (
              <label
                key={option!.optionId}
                htmlFor={`${groupId}-${option!.optionId}`}
                className={cn(
                  "flex items-center gap-3.5 p-4 rounded-xl border transition-all cursor-pointer select-none",
                  isSelected
                    ? "border-brand bg-brand/10 shadow-xs ring-1 ring-brand/40"
                    : "border-border/80 bg-card hover:border-brand/40 hover:bg-main-hover",
                  disabled && "opacity-60 cursor-not-allowed",
                )}
              >
                <RadioGroupItem
                  id={`${groupId}-${option!.optionId}`}
                  value={optionValue.toLowerCase()}
                  data-testid={
                    testIdPrefix
                      ? `${testIdPrefix}-${option!.optionId}`
                      : undefined
                  }
                  className="shrink-0"
                />
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-semibold",
                    isSelected
                      ? "bg-brand text-white border-brand"
                      : "bg-muted text-muted-foreground border-border",
                  )}
                >
                  {badgeLetter}
                </span>
                <Label
                  htmlFor={`${groupId}-${option!.optionId}`}
                  className="font-medium text-sm sm:text-base text-foreground cursor-pointer flex-1"
                >
                  {option!.value}
                </Label>
              </label>
            );
          })}
        </RadioGroup>
        {errorMessage ? (
          <p
            id={errorId}
            className="text-sm text-destructive"
            role="alert"
            data-testid={testIdPrefix ? `${testIdPrefix}-error` : undefined}
          >
            {errorMessage}
          </p>
        ) : null}
      </div>
    );
  }

  const currentIds =
    value?.kind === "multiple_choice" &&
    value.questionId === question.questionId
      ? value.selectedOptionIds
      : [];

  return (
    <div
      className="space-y-3"
      data-testid={testIdPrefix ? `${testIdPrefix}-root` : undefined}
    >
      <RadioGroup
        id={groupId}
        value={currentIds[0] ?? ""}
        disabled={disabled}
        onValueChange={(next) => {
          if (disabled) return;
          onChange({
            kind: "multiple_choice",
            questionId: question.questionId,
            selectedOptionIds: [next],
          });
        }}
        aria-describedby={errorMessage ? errorId : undefined}
        aria-invalid={errorMessage ? true : undefined}
        className="grid grid-cols-1 gap-2.5"
      >
        {question.answerOptions.map((option, idx) => {
          const isSelected = currentIds[0] === option.optionId;
          const letter = OPTION_LETTERS[idx] ?? `${idx + 1}`;

          return (
            <label
              key={option.optionId}
              htmlFor={`${groupId}-${option.optionId}`}
              className={cn(
                "flex items-center gap-3.5 p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer select-none",
                isSelected
                  ? "border-brand bg-brand/10 shadow-xs ring-1 ring-brand/40"
                  : "border-border/80 bg-card hover:border-brand/40 hover:bg-main-hover",
                disabled && "opacity-60 cursor-not-allowed",
              )}
            >
              <RadioGroupItem
                id={`${groupId}-${option.optionId}`}
                value={option.optionId}
                data-testid={
                  testIdPrefix
                    ? `${testIdPrefix}-${option.optionId}`
                    : undefined
                }
                className="shrink-0"
              />
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-semibold",
                  isSelected
                    ? "bg-brand text-white border-brand"
                    : "bg-muted text-muted-foreground border-border",
                )}
              >
                {letter}
              </span>
              <Label
                htmlFor={`${groupId}-${option.optionId}`}
                className="font-medium text-sm sm:text-base text-foreground cursor-pointer flex-1"
              >
                {option.value}
              </Label>
            </label>
          );
        })}
      </RadioGroup>
      {errorMessage ? (
        <p
          id={errorId}
          className={cn("text-sm text-destructive")}
          role="alert"
          data-testid={testIdPrefix ? `${testIdPrefix}-error` : undefined}
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
