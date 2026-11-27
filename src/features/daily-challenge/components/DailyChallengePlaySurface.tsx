"use client";

import { useEffect, useState } from "react";

import { cn } from "@/shared/utils/merge-class-names";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";

import { useDailyChallengePlay } from "../hooks/useDailyChallengePlay";

import {
  DailyChallengeCompletionPanel,
  DailyChallengeErrorPanel,
  DailyChallengeQuestionPanel,
} from "./DailyChallengePlayPanels";

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
        "rounded-xl border border-border/70 bg-card py-6 text-foreground shadow-xs sm:py-8",
        className,
      )}
    >
      <CardHeader className="px-6 pb-4 sm:px-8">
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
            <span className="font-mono font-semibold tabular-nums text-foreground">
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
      <CardContent className="space-y-6 px-6 pb-4 pt-2 sm:px-8">
        {isQuizLoading && status === "idle" ? (
          <p
            className="text-sm text-foreground-secondary"
            data-testid="daily-challenge-play-loading"
          >
            Loading the day&apos;s questions…
          </p>
        ) : status === "completed" && finalScore !== null ? (
          <DailyChallengeCompletionPanel
            finalScore={finalScore}
            rewardXp={rewardXp}
            onDone={onTodayRefresh}
          />
        ) : status === "error" ? (
          <DailyChallengeErrorPanel
            lastError={lastError}
            onRetry={onTodayRefresh}
          />
        ) : question ? (
          <DailyChallengeQuestionPanel
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
