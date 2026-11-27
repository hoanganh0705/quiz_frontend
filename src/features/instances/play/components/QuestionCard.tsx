"use client";

import { useQuestionRevealed } from "@/features/instances/play/hooks";

import { Badge } from "@/components/ui/Badge";

import { cn } from "@/shared/utils/merge-class-names";

import {
  selectSelectedOptionForQuestion,
  useInstanceGameplayStore,
} from "../stores/instanceGameplay.store";
import { GameEmptyState } from "./shared/GameEmptyState";
import { GameSkeleton } from "./shared/GameSkeleton";

import type { UseQuestionRevealedResult } from "@/features/instances/play/hooks";

interface QuestionCardProps {
  instanceId: string;
  className?: string;
}

function getDifficultyVariant(
  difficulty: string | undefined,
): "difficulty-easy" | "difficulty-medium" | "difficulty-hard" | "secondary" {
  const normalized = difficulty?.trim().toLowerCase();
  if (normalized === "easy") return "difficulty-easy";
  if (normalized === "medium") return "difficulty-medium";
  if (normalized === "hard") return "difficulty-hard";
  return "secondary";
}

export function QuestionCard({ instanceId, className }: QuestionCardProps) {
  const { bundle, hasRevealed, isStale }: UseQuestionRevealedResult =
    useQuestionRevealed(instanceId);

  const selectedOptionId = useInstanceGameplayStore((s) =>
    selectSelectedOptionForQuestion(s, instanceId, bundle?.question.id ?? null),
  );

  if (!hasRevealed) {
    return (
      <div className={cn("space-y-4", className)}>
        <GameSkeleton />
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className={className}>
        <GameEmptyState />
      </div>
    );
  }

  const { question } = bundle;
  const isAnswered = selectedOptionId !== null;

  return (
    <div
      className={cn("space-y-4", className)}
      data-testid="question-card"
      role="region"
      aria-label="Current question"
      aria-live="polite"
    >
      {/* Header metadata badges — matches AttemptQuestionCard */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1 font-mono text-xs font-semibold tabular-nums text-brand"
          data-testid="question-index"
        >
          Question {question.index}/{question.total}
        </span>

        {isAnswered ? (
          <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-mono text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Answered
          </span>
        ) : null}

        {question.difficulty ? (
          <Badge
            variant={getDifficultyVariant(question.difficulty)}
            className="capitalize"
            data-testid="question-difficulty"
          >
            {question.difficulty}
          </Badge>
        ) : null}

        {question.category ? (
          <Badge variant="secondary" data-testid="question-category">
            {question.category}
          </Badge>
        ) : null}

        {question.basePoints !== undefined && question.basePoints > 0 ? (
          <span
            className="ml-auto font-mono text-xs font-medium tabular-nums text-muted-foreground"
            data-testid="question-points"
          >
            {question.basePoints} pts
            {question.difficultyMultiplier &&
            question.difficultyMultiplier !== 1
              ? ` ×${question.difficultyMultiplier}`
              : null}
          </span>
        ) : null}
      </div>

      {/* Question text */}
      <h2
        className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-snug wrap-break-word"
        data-testid="question-text"
      >
        {question.text}
      </h2>

      {/* Optional media */}
      {question.mediaUrl ? (
        <div className="relative overflow-hidden rounded-xl border border-border/80 max-h-72">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={question.mediaUrl}
            alt=""
            className="w-full h-auto max-h-72 object-contain"
            data-testid="question-media"
          />
        </div>
      ) : null}

      {isStale ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Syncing latest question state…
        </p>
      ) : null}
    </div>
  );
}
