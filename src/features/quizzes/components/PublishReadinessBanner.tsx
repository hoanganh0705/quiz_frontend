"use client";

import { memo } from "react";

import { CheckCircle2, Circle, Plus, Rocket } from "lucide-react";

import { PUBLISH_MIN_QUESTIONS } from "@/features/quizzes/types/publish.types";

import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";

export interface PublishReadinessBannerProps {
  questionCount: number;

  minQuestions?: number;

  isReady: boolean;

  onPublish: () => void;

  onAddQuestions: () => void;

  isPublishing?: boolean;

  isVisible?: boolean;

  onDismiss?: () => void;

  className?: string;
}

export const PublishReadinessBanner = memo(function PublishReadinessBanner({
  questionCount,
  minQuestions = PUBLISH_MIN_QUESTIONS,
  isReady,
  onPublish,
  onAddQuestions,
  isPublishing = false,
  isVisible = true,
  className,
}: PublishReadinessBannerProps): React.ReactElement | null {
  if (!isVisible) return null;

  const questionsNeeded = Math.max(0, minQuestions - questionCount);
  const progressPercent = Math.min(100, (questionCount / minQuestions) * 100);

  return (
    <div
      className={`
        rounded-lg border p-4 transition-colors
        ${
          isReady
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950"
            : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
        }
        ${className ?? ""}
      `}
      data-testid="publish-readiness-banner"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: status + progress */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            {isReady ? (
              <CheckCircle2
                className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
            ) : (
              <Circle
                className="h-5 w-5 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
            )}
            <span
              className={`text-sm font-medium ${
                isReady
                  ? "text-emerald-900 dark:text-emerald-100"
                  : "text-amber-900 dark:text-amber-100"
              }`}
              data-testid="banner-title"
            >
              {isReady
                ? "Ready to publish"
                : `Add ${questionsNeeded} more question${questionsNeeded === 1 ? "" : "s"} to publish`}
            </span>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {questionCount}/{minQuestions} questions
              </span>
              <span className="text-muted-foreground">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <Progress
              value={progressPercent}
              className="h-2 bg-muted"
              data-testid="progress-bar"
            />
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {!isReady && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddQuestions}
              className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900"
              data-testid="add-questions-btn"
            >
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
              Add questions
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            onClick={onPublish}
            disabled={!isReady || isPublishing}
            data-testid="publish-btn"
            className={isReady ? "" : "opacity-50 cursor-not-allowed"}
          >
            <Rocket className="mr-1 h-4 w-4" aria-hidden="true" />
            {isPublishing ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </div>
    </div>
  );
});
