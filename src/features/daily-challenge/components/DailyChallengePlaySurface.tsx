"use client";

/**
 * `DailyChallengePlaySurface` — in-page question player for the day's
 * daily-challenge.
 *
 * The surface is mounted inside the live branch of
 * `DailyChallengePage` only when `challenge.status === 'pending'` and
 * the viewer is authenticated. The card above provides the meta
 * surface (title / difficulty / reward XP / status-aware CTA); the
 * play surface is the question UI. There is no navigation between
 * them — the day is consumed on the page.
 *
 * ## State machine
 *
 * The surface owns a small state machine driven by `useDailyChallengePlay`:
 *
 *   - `'idle'`        — render the current question and option buttons.
 *   - `'submitting'`  — render a skeleton option set + a "Submitting…"
 *                       hint; option buttons are disabled.
 *   - `'reveal'`      — render the correctness reveal ("Correct" /
 *                       "Not quite — moving on") and an auto-advance
 *                       after a 1.2s timeout.
 *   - `'completed'`   — render the recap card with `finalScore`, the
 *                       XP-reward line, and a "Back to challenges"
 *                       link.
 *   - `'error'`       — render an inline alert with the `lastError`
 *                       message; surface a "Try again" affordance
 *                       that re-fetches the today hook on 409.
 *
 * The surface never persists to local storage; reloading the page
 * reverts to the `'idle'` branch and the user resumes from question 0
 * (the server is authoritative for the cursor — see the play hook's
 * state-machine docs).
 *
 * ## Accessibility
 *
 *   - The question region is a `role="region"` with
 *     `aria-label="Daily challenge question"`.
 *   - Option buttons are keyboard-reachable; the selected option
 *     announces `aria-pressed="true"` until the surface advances.
 *   - The progress bar (`role="progressbar"`) announces
 *     `aria-valuenow` / `aria-valuemax` for screen readers.
 *   - The reveal copy has `aria-live="polite"` so the correctness
 *     hint is announced without interrupting the user's flow.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  ChevronRight,
  RefreshCcw,
  Sparkles,
  AlertCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";

import { cn } from "@/shared/utils/merge-class-names";

import { useDailyChallengePlay } from "../hooks/useDailyChallengePlay";

export interface DailyChallengePlaySurfaceProps {
  quizId: string;
  totalQuestions: number;
  rewardXp: number;
  onTodayRefresh?: () => Promise<void> | void;
  className?: string;
}

const REVEAL_DELAY_MS = 1200;

export function DailyChallengePlaySurface({
  quizId,
  totalQuestions,
  rewardXp,
  onTodayRefresh,
  className,
}: DailyChallengePlaySurfaceProps) {
  const play = useDailyChallengePlay({ quizId, onTodayRefresh });
  const {
    questions,
    currentIndex,
    status,
    lastRevealCorrect,
    finalScore,
    lastError,
    isQuizLoading,
    submitAnswer,
    advance,
  } = play;

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // Auto-advance after the reveal-toast timer expires.
  useEffect(() => {
    if (status !== "reveal") return;
    const timer = setTimeout(() => {
      advance();
      setSelectedOptionId(null);
    }, REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [status, advance]);

  const question = questions[currentIndex];
  const hasQuestions = questions.length > 0;
  const totalForDisplay = hasQuestions ? questions.length : totalQuestions;
  const stepForDisplay = Math.min(currentIndex + 1, totalForDisplay || 1);
  const progressValue = hasQuestions
    ? Math.round((currentIndex / questions.length) * 100)
    : 0;

  return (
    <Card
      role="region"
      aria-label="Daily challenge question"
      data-testid="daily-challenge-play-surface"
      data-status={status}
      className={cn(
        "rounded-xl border border-border/70 bg-card text-foreground py-6 sm:py-8 shadow-xs",
        className,
      )}
    >
      <CardHeader className="px-6 sm:px-8 pb-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle
            id="daily-challenge-play-title"
            className="text-xl font-bold tracking-tight"
          >
            <span
              data-testid="daily-challenge-play-step"
              className="font-mono tabular-nums"
            >
              Question {stepForDisplay} of {totalForDisplay}
            </span>
          </CardTitle>
          <span className="text-sm text-foreground-secondary">
            Reward:{" "}
            <span className="font-semibold font-mono tabular-nums text-foreground">
              +{rewardXp} XP
            </span>
          </span>
        </div>
        <Progress
          value={progressValue}
          aria-label="Daily challenge progress"
          data-testid="daily-challenge-play-progress"
          className="mt-3 h-2"
        />
      </CardHeader>
      <CardContent className="px-6 sm:px-8 space-y-6 pt-2 pb-4">
        {isQuizLoading && status === "idle" ? (
          <p
            className="text-sm text-foreground-secondary"
            data-testid="daily-challenge-play-loading"
          >
            Loading the day&apos;s questions…
          </p>
        ) : status === "completed" && finalScore !== null ? (
          <CompletionPanel finalScore={finalScore} rewardXp={rewardXp} />
        ) : status === "error" ? (
          <ErrorPanel lastError={lastError} onRetry={onTodayRefresh} />
        ) : question ? (
          <QuestionPanel
            key={currentIndex}
            question={question}
            selectedOptionId={selectedOptionId}
            onSelect={setSelectedOptionId}
            isSubmitting={status === "submitting"}
            revealCorrect={lastRevealCorrect}
            isReveal={status === "reveal"}
            onAdvance={() => {
              advance();
              setSelectedOptionId(null);
            }}
            onSubmit={() => {
              void submitAnswer(selectedOptionId);
            }}
          />
        ) : (
          <p
            className="text-sm text-foreground-secondary"
            data-testid="daily-challenge-play-empty"
          >
            No questions are available for the day&apos;s quiz yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Sub-panels ────────────────────────────────────────────────────────

function QuestionPanel({
  question,
  selectedOptionId,
  onSelect,
  isSubmitting,
  revealCorrect,
  isReveal = false,
  onAdvance,
  onSubmit,
}: {
  question: import("@/features/quizzes/lib/quiz-player-view").PlayerQuestion;
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
      onSelect(options[nextIndex].optionId);
      const nextButton = document.querySelector<HTMLButtonElement>(
        `[data-option-id="${options[nextIndex].optionId}"]`,
      );
      nextButton?.focus();
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      const prevIndex =
        currentIndex > 0 ? currentIndex - 1 : options.length - 1;
      onSelect(options[prevIndex].optionId);
      const prevButton = document.querySelector<HTMLButtonElement>(
        `[data-option-id="${options[prevIndex].optionId}"]`,
      );
      prevButton?.focus();
    }
  };

  return (
    <div className="space-y-6 py-2" data-testid="daily-challenge-play-question">
      <p
        id={`daily-challenge-question-${question.questionId}`}
        className="text-base sm:text-lg font-semibold leading-relaxed text-foreground"
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
                "flex items-center justify-between rounded-lg border bg-background px-4 py-3.5 text-left text-sm font-medium transition-all duration-200 cursor-pointer",
                "hover:border-brand/50 hover:bg-muted/30 focus-visible:border-brand focus-visible:ring-brand/40 focus-visible:ring-[3px] focus-visible:outline-none",
                isSelected &&
                  "border-brand bg-brand/10 text-brand shadow-xs ring-1 ring-brand/30 font-semibold",
                (isSubmitting || isReveal) && "cursor-not-allowed opacity-60",
              )}
            >
              <span className="text-foreground">{option.value}</span>
              {isSelected ? (
                <ChevronRight
                  className="h-4 w-4 text-brand shrink-0"
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
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Correct — moving on
            </span>
          ) : revealCorrect === false ? (
            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
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
            className="bg-brand hover:bg-brand-hover text-brand-foreground font-semibold"
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
            className="bg-brand hover:bg-brand-hover text-brand-foreground font-semibold"
          >
            {isSubmitting ? "Submitting…" : "Submit"}
          </Button>
        )}
      </div>
    </div>
  );
}

function CompletionPanel({
  finalScore,
  rewardXp,
}: {
  finalScore: number;
  rewardXp: number;
}) {
  return (
    <div
      className="space-y-4 text-center py-4"
      data-testid="daily-challenge-play-completion"
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 border border-brand/20 text-brand">
        <Sparkles className="h-7 w-7 text-brand" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
          You scored {Math.round(finalScore)}%
        </p>
        <p className="text-sm text-foreground-secondary">
          Reward earned:{" "}
          <span className="font-semibold font-mono tabular-nums text-foreground">
            +{rewardXp} XP
          </span>
        </p>
      </div>
      <div className="pt-2">
        <Link
          href="/daily-challenge"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-xs"
          data-testid="daily-challenge-play-back"
        >
          Back to challenges
        </Link>
      </div>
    </div>
  );
}

function ErrorPanel({
  lastError,
  onRetry,
}: {
  lastError: import("@/lib/api").ApiError | null;
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
          className="rounded-lg border-border/80 bg-background hover:bg-muted font-medium cursor-pointer"
        >
          <RefreshCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Refresh today&apos;s challenge
        </Button>
      ) : null}
    </div>
  );
}
