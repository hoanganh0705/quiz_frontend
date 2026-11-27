"use client";

import * as React from "react";

import { getUserCopy } from "@/lib/api/error-codes";
import { useToast } from "@/lib/forms/useToast";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

import type { useAttemptRunner } from "@/features/attempts/hooks/useAttemptRunner";
import type { ApiError } from "@/lib/api";

export function CompleteQuizButton({
  runner,
  allAnswered,
  remainingCount,
  onNavigateToUnanswered,
}: {
  runner: ReturnType<typeof useAttemptRunner>;
  allAnswered: boolean;
  remainingCount: number;
  onNavigateToUnanswered?: () => void;
}): React.ReactElement {
  const { completeQuiz } = runner;
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showIncompleteDialog, setShowIncompleteDialog] = React.useState(false);
  const { push } = useToast();

  const performSubmit = async () => {
    setIsSubmitting(true);
    try {
      await completeQuiz();
    } catch (error) {
      const code = (error as ApiError)?.code;
      const copy = getUserCopy(code ?? "ATTEMPT_UNKNOWN");
      push({
        title: copy.title,
        body: copy.body,
        durationMs: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (isSubmitting) return;
    if (!allAnswered) {
      setShowIncompleteDialog(true);
      return;
    }
    void performSubmit();
  };

  return (
    <>
      <div className="sticky bottom-3 z-20 mt-2 rounded-2xl border border-border/80 bg-card/95 p-4 shadow-lg backdrop-blur-md">
        <Button
          type="button"
          variant="default"
          size="lg"
          className="w-full cursor-pointer rounded-xl bg-brand py-3 font-semibold text-white shadow-sm transition-all hover:bg-brand-hover hover:shadow-brand/20"
          disabled={isSubmitting}
          onClick={handleSubmit}
          data-testid="attempt-runner-submit-quiz"
        >
          {isSubmitting ? "Submitting..." : "Submit Quiz"}
        </Button>
        {remainingCount > 0 && (
          <p className="mt-2 text-center font-mono text-xs tabular-nums text-muted-foreground">
            {remainingCount} question{remainingCount !== 1 ? "s" : ""} remaining
          </p>
        )}
      </div>

      <AlertDialog
        open={showIncompleteDialog}
        onOpenChange={setShowIncompleteDialog}
      >
        <AlertDialogContent data-testid="attempt-incomplete-submit-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Submit incomplete quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              You still have{" "}
              <span className="font-semibold text-foreground">
                {remainingCount} unanswered question
                {remainingCount !== 1 ? "s" : ""}
              </span>
              . If you submit now, unanswered questions will be marked as{" "}
              <span className="font-semibold text-foreground">undone</span> and
              will not be scored. Are you sure you want to submit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowIncompleteDialog(false);
                onNavigateToUnanswered?.();
              }}
              data-testid="attempt-incomplete-submit-cancel"
            >
              Continue quiz
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowIncompleteDialog(false);
                void performSubmit();
              }}
              className="cursor-pointer bg-brand text-white hover:bg-brand-hover"
              data-testid="attempt-incomplete-submit-confirm"
            >
              Submit anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function RunnerSkeleton(): React.ReactElement {
  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4"
      data-testid="attempt-runner-skeleton"
    >
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
