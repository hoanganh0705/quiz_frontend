"use client";

/**
 * `AnswerOptions` — player-safe single-choice answer options.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.E1.
 *
 * Renders the options from the current player-safe bundle. Each option
 * is disabled when `canSubmit === false` (window closed, submission accepted,
 * disconnected, auth failed, or feature flag disabled). Clicking an option
 * invokes `useSubmitInstanceAnswer.submit` exactly once per question.
 * No `isCorrect`, correctness indicator, `explanation`, or `solution` is
 * rendered at any stage.
 */

import { Loader2 } from "lucide-react";
import { useCallback } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";

import {
  useQuestionRevealed,
  useSubmitInstanceAnswer,
  type UseQuestionRevealedResult,
} from "@/features/instances/play/hooks";

interface AnswerOptionsProps {
  instanceId: string;
  className?: string;
}

export function AnswerOptions({ instanceId, className }: AnswerOptionsProps) {
  const { bundle }: UseQuestionRevealedResult = useQuestionRevealed(instanceId);
  const questionId = bundle?.question.id ?? null;

  const {
    submit,
    state: submissionState,
    canSubmit,
  } = useSubmitInstanceAnswer(instanceId, questionId);

  const isPending = submissionState === "pending";
  const isAccepted = submissionState === "accepted";

  const handleOptionClick = useCallback(
    (optionId: string) => {
      if (!canSubmit || isPending || isAccepted) return;
      submit(optionId);
    },
    [canSubmit, isPending, isAccepted, submit],
  );

  if (!bundle || bundle.options.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("space-y-3", className)}
      data-testid="answer-options"
      role="radiogroup"
      aria-label="Answer options"
    >
      {bundle.options.map((option) => {
        const isDisabled = !canSubmit || isPending;
        const isSelected =
          isAccepted &&
          bundle?.question.id === questionId;

        return (
          <OptionRow
            key={option.id}
            option={option}
            isDisabled={isDisabled}
            isPending={isPending}
            isSelected={isSelected}
            onSelect={handleOptionClick}
            optionIndex={option.index}
          />
        );
      })}
    </div>
  );
}

// ─── Option row ────────────────────────────────────────────────────────────

interface OptionRowProps {
  option: {
    id: string;
    index: number;
    text: string;
    mediaUrl?: string;
  };
  isDisabled: boolean;
  isPending: boolean;
  isSelected: boolean;
  onSelect: (optionId: string) => void;
  optionIndex: number;
}

function OptionRow({
  option,
  isDisabled,
  isPending,
  isSelected,
  onSelect,
  optionIndex,
}: OptionRowProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border transition-colors",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/30",
        isDisabled && "opacity-60 cursor-not-allowed",
      )}
      data-testid="option-row"
      data-option-id={option.id}
      data-option-index={optionIndex}
    >
      {/* Radio-style indicator */}
      <div
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 mt-0.5 transition-colors",
          isSelected
            ? "border-primary bg-primary"
            : "border-muted-foreground/30",
          isDisabled && "border-muted-foreground/20",
        )}
        aria-hidden="true"
      >
        {isPending && (
          <Loader2 className="h-3 w-3 text-white animate-spin" />
        )}
      </div>

      {/* Option content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-relaxed">
          {option.text}
        </p>
        {option.mediaUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={option.mediaUrl}
            alt=""
            className="mt-2 w-full max-h-32 object-contain rounded"
            data-testid="option-media"
          />
        )}
      </div>

      {/* CTA */}
      <Button
        type="button"
        variant={isSelected ? "secondary" : "outline"}
        size="sm"
        disabled={isDisabled}
        onClick={() => onSelect(option.id)}
        className="shrink-0"
        aria-label={
          isSelected
            ? `Option ${optionIndex + 1} selected`
            : `Select option ${optionIndex + 1}`
        }
        data-testid="option-select-button"
      >
        {isSelected ? "Selected" : isPending ? "Submitting…" : "Select"}
      </Button>
    </div>
  );
}
