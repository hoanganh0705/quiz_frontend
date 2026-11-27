"use client";

import Link from "next/link";

import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  RefreshCcw,
  Sparkles,
  XCircle,
} from "lucide-react";

import { cn } from "@/shared/utils/merge-class-names";

import { Button } from "@/components/ui/Button";

import type { PlayerQuestion } from "@/features/quizzes/lib/quiz-player-view";
import type { ApiError } from "@/lib/api";

export function DailyChallengeQuestionPanel({
  question,
  selectedOptionId,
  onSelect,
  isSubmitting,
  revealCorrect,
  isReveal = false,
  onAdvance,
  onSubmit,
}: {
  question: PlayerQuestion;
  selectedOptionId: string | null;
  onSelect: (optionId: string | null) => void;
  isSubmitting: boolean;
  revealCorrect: boolean | null;
  isReveal?: boolean;
  onAdvance?: () => void;
  onSubmit: () => void;
}) {
  const options = question.answerOptions;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isSubmitting || isReveal || options.length === 0) return;
    const currentIndex = options.findIndex(
      (opt) => opt.optionId === selectedOptionId,
    );

    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      const nextIndex =
        currentIndex < options.length - 1 ? currentIndex + 1 : 0;
      const nextOption = options[nextIndex];
      if (!nextOption) return;
      onSelect(nextOption.optionId);
      const nextButton = document.querySelector<HTMLButtonElement>(
        `[data-option-id="${nextOption.optionId}"]`,
      );
      nextButton?.focus();
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      const prevIndex =
        currentIndex > 0 ? currentIndex - 1 : options.length - 1;
      const prevOption = options[prevIndex];
      if (!prevOption) return;
      onSelect(prevOption.optionId);
      const prevButton = document.querySelector<HTMLButtonElement>(
        `[data-option-id="${prevOption.optionId}"]`,
      );
      prevButton?.focus();
    }
  };

  return (
    <div className="space-y-6 py-2" data-testid="daily-challenge-play-question">
      <p
        id={`daily-challenge-question-${question.questionId}`}
        className="text-base font-semibold leading-relaxed text-foreground sm:text-lg"
      >
        {question.questionText}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={`daily-challenge-question-${question.questionId}`}
        onKeyDown={handleKeyDown}
        className="grid gap-3 pt-1"
      >
        {options.map((option, index) => {
          const isSelected = selectedOptionId === option.optionId;
          const isRovingTabStop =
            isSelected || (!selectedOptionId && index === 0);

          return (
            <button
              key={option.optionId}
              type="button"
              role="radio"
              tabIndex={isRovingTabStop ? 0 : -1}
              aria-checked={isSelected}
              disabled={isSubmitting || isReveal}
              data-testid="daily-challenge-play-option"
              data-option-id={option.optionId}
              data-selected={isSelected}
              onClick={() => onSelect(option.optionId)}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-lg border bg-background px-4 py-3.5 text-left text-sm font-medium transition-all duration-200",
                "hover:border-brand/50 hover:bg-muted/30 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/40",
                isSelected &&
                  "border-brand bg-brand/10 font-semibold text-brand shadow-xs ring-1 ring-brand/30",
                (isSubmitting || isReveal) && "cursor-not-allowed opacity-60",
              )}
            >
              <span className="text-foreground">{option.value}</span>
              {isSelected ? (
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-brand"
                  aria-hidden="true"
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-3 pt-2">
        <p
          className="text-xs text-foreground-secondary"
          aria-live="polite"
          data-testid="daily-challenge-play-reveal"
        >
          {revealCorrect === true ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Correct — moving on
            </span>
          ) : revealCorrect === false ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Not quite — moving on
            </span>
          ) : (
            "Select an option and submit."
          )}
        </p>
        {isReveal && onAdvance ? (
          <Button
            type="button"
            onClick={onAdvance}
            data-testid="daily-challenge-play-submit"
            aria-label="Next question"
            className="bg-brand font-semibold text-brand-foreground hover:bg-brand-hover"
          >
            Continue
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!selectedOptionId || isSubmitting}
            data-testid="daily-challenge-play-submit"
            aria-label="Submit answer"
            className="bg-brand font-semibold text-brand-foreground hover:bg-brand-hover"
          >
            {isSubmitting ? "Submitting…" : "Submit"}
          </Button>
        )}
      </div>
    </div>
  );
}

export function DailyChallengeCompletionPanel({
  finalScore,
  rewardXp,
  onDone,
}: {
  finalScore: number;
  rewardXp: number;
  onDone?: () => Promise<void> | void;
}) {
  return (
    <div
      className="space-y-4 py-4 text-center"
      data-testid="daily-challenge-play-completion"
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/20 bg-brand/10 text-brand">
        <Sparkles className="h-7 w-7 text-brand" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
          You scored {Math.round(finalScore)}%
        </p>
        <p className="text-sm text-foreground-secondary">
          Reward earned:{" "}
          <span className="font-mono font-semibold tabular-nums text-foreground">
            +{rewardXp} XP
          </span>
        </p>
      </div>
      <div className="flex items-center justify-center gap-3 pt-2">
        {onDone ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void onDone()}
            className="rounded-md"
            data-testid="daily-challenge-play-back"
          >
            Back to challenges
          </Button>
        ) : (
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            data-testid="daily-challenge-play-back"
          >
            View leaderboard
          </Link>
        )}
      </div>
    </div>
  );
}

export function DailyChallengeErrorPanel({
  lastError,
  onRetry,
}: {
  lastError: ApiError | null;
  onRetry?: () => Promise<void> | void;
}) {
  return (
    <div
      className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm"
      role="alert"
      data-testid="daily-challenge-play-error"
    >
      <p className="flex items-center gap-2 font-medium text-destructive">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        Could not submit your answer
      </p>
      <p className="text-foreground-secondary">
        {lastError?.message ??
          "The daily-challenge state drifted. Refresh to retry."}
      </p>
      {onRetry ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void onRetry()}
          data-testid="daily-challenge-play-retry"
          className="cursor-pointer rounded-lg border-border/80 bg-background font-medium hover:bg-muted"
        >
          <RefreshCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Refresh today&apos;s challenge
        </Button>
      ) : null}
    </div>
  );
}
