"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/lib/forms/useToast";
import { ApiError } from "@/lib/api";
import { getUserCopy } from "@/lib/api/error-codes";
import { cn } from "@/shared/utils/merge-class-names";

import {
  useAttemptRunner,
  type UseAttemptRunnerParams,
} from "@/features/attempts/hooks/useAttemptRunner";
import type { AnswerSelection } from "../types";

import {
  AttemptAbandonDialog,
  AttemptHeader,
  AttemptQuestionCard,
} from "@/features/attempts/components";

export type AttemptRunnerProps = UseAttemptRunnerParams;

export function AttemptRunner(props: AttemptRunnerProps): React.ReactElement {
  const runner = useAttemptRunner(props);
  const router = useRouter();
  const { push } = useToast();

  const [abandonOpen, setAbandonOpen] = React.useState(false);
  const [activeQuestionIndex, setActiveQuestionIndex] = React.useState(0);

  const isQuestionAnswered = React.useCallback(
    (questionId: string) =>
      Boolean(runner.drafts[questionId] || runner.submittedAnswers[questionId]),
    [runner.drafts, runner.submittedAnswers],
  );

  React.useEffect(() => {
    if (runner.status !== "in_progress" && runner.status !== "submitting")
      return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const total = runner.questions.length;
      if (total === 0) return;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setActiveQuestionIndex((prev) => Math.min(prev + 1, total - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setActiveQuestionIndex((prev) => Math.max(prev - 1, 0));
      } else if (["1", "2", "3", "4"].includes(e.key)) {
        const optionIndex = parseInt(e.key, 10) - 1;
        const currentQ = runner.questions[activeQuestionIndex];
        if (currentQ?.answerOptions && currentQ.answerOptions[optionIndex]) {
          e.preventDefault();
          const targetOpt = currentQ.answerOptions[optionIndex];
          const isTrueFalse = currentQ.answerOptions.length <= 2;
          const selection: AnswerSelection = isTrueFalse
            ? {
                kind: "true_false",
                questionId: currentQ.questionId,
                value: targetOpt.value?.toLowerCase() === "true",
              }
            : {
                kind: "multiple_choice",
                questionId: currentQ.questionId,
                selectedOptionIds: [targetOpt.optionId],
              };
          runner.updateDraft(selection);
          void runner.selectAnswer(currentQ, selection);
        }
      } else if (e.key === "Enter") {
        const isAll =
          runner.questions.length > 0 &&
          runner.questions.every((q) => isQuestionAnswered(q.questionId));

        if (isAll && activeQuestionIndex === total - 1) {
          e.preventDefault();
          void runner.completeQuiz();
        } else if (activeQuestionIndex < total - 1) {
          e.preventDefault();
          setActiveQuestionIndex((prev) => prev + 1);
        } else if (isAll) {
          e.preventDefault();
          void runner.completeQuiz();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [runner, activeQuestionIndex, isQuestionAnswered]);

  React.useEffect(() => {
    if (!runner.navigation) return;
    const intent = runner.navigation;
    if (intent.kind === "push_attempt") {
      router.push(intent.href);
    } else if (intent.kind === "push_quiz") {
      router.push(intent.href);
    } else if (intent.kind === "replace_login") {
      router.replace(intent.href);
    }
    runner.consumeNavigation();
  }, [runner, router]);

  React.useEffect(() => {
    if (!runner.error) return;
    const code = (runner.error as ApiError).code;
    const copy = getUserCopy(code ?? "ATTEMPT_UNKNOWN");
    push({
      title: copy.title,
      body: copy.body,
      durationMs: 5000,
    });
  }, [runner.error, push]);

  if (!runner.hasHydrated && runner.isActiveLoading) {
    return <RunnerSkeleton />;
  }

  if (runner.status === "idle" && !runner.activeAttempt) {
    return (
      <div
        className="mx-auto max-w-3xl p-4 text-sm text-muted-foreground"
        data-testid="attempt-runner-no-active"
      >
        No active attempt. Return to the quiz page to start one.
      </div>
    );
  }

  if (runner.status === "abandoned") {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 p-4"
        data-testid="attempt-runner-abandoned"
      >
        <AttemptHeader
          title={props.idOrSlug ?? "Attempt"}
          status="abandoned"
          onAbandon={() => undefined}
        />
        <p className="text-sm text-muted-foreground">
          This attempt was abandoned. You can return to the quiz page to start a
          new attempt.
        </p>
      </div>
    );
  }

  if (runner.status === "completed") {
    return (
      <div
        className="mx-auto max-w-3xl p-4 text-sm text-muted-foreground"
        data-testid="attempt-runner-completed"
      >
        Attempt completed. Results will be available shortly.
      </div>
    );
  }

  const totalQuestions = runner.totalQuestions;
  const answeredCount = runner.questions.filter((q) =>
    isQuestionAnswered(q.questionId),
  ).length;
  const allAnswered = answeredCount >= totalQuestions && totalQuestions > 0;

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4"
      data-testid="attempt-runner"
    >
      <AttemptHeader
        title={props.idOrSlug ?? "Attempt"}
        status={runner.status}
        onAbandon={() => setAbandonOpen(true)}
      />

      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">
            {answeredCount} / {totalQuestions} answered
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{
              width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Question minimap stepper */}
      {totalQuestions > 1 && (
        <nav
          aria-label="Question Navigator"
          className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-xl bg-card border border-border/80 shadow-xs"
        >
          <span className="text-xs font-mono text-muted-foreground mr-1 hidden sm:inline">
            Questions:
          </span>
          {runner.questions.map((q, idx) => {
            const isAnswered = isQuestionAnswered(q.questionId);
            const isActive = idx === activeQuestionIndex;
            return (
              <button
                key={q.questionId}
                type="button"
                onClick={() => {
                  setActiveQuestionIndex(idx);
                }}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md font-mono text-xs transition-all cursor-pointer",
                  isActive && "ring-2 ring-brand bg-brand text-white font-bold",
                  !isActive &&
                    isAnswered &&
                    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-medium",
                  !isActive &&
                    !isAnswered &&
                    "bg-muted/50 text-muted-foreground border border-border/70 hover:bg-muted",
                )}
                aria-label={`Question ${idx + 1}${isAnswered ? " (Answered)" : ""}`}
                aria-current={isActive ? "step" : undefined}
              >
                {idx + 1}
              </button>
            );
          })}
          <div className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground md:flex">
            <span className="font-mono bg-muted px-1.5 py-0.5 rounded border border-border text-xs">
              1-4
            </span>
            <span>Pick</span>
            <span className="font-mono bg-muted px-1.5 py-0.5 rounded border border-border text-xs">
              ←/→
            </span>
            <span>Nav</span>
            <span className="font-mono bg-muted px-1.5 py-0.5 rounded border border-border text-xs">
              ↵
            </span>
            <span>Next</span>
          </div>
        </nav>
      )}

      {/* Active single question */}
      <AttemptRunnerActiveQuestion
        runner={runner}
        activeIndex={activeQuestionIndex}
        onNext={() =>
          setActiveQuestionIndex((prev) =>
            Math.min(prev + 1, totalQuestions - 1),
          )
        }
        onPrevious={() =>
          setActiveQuestionIndex((prev) => Math.max(prev - 1, 0))
        }
      />

      {/* Submit Quiz button */}
      <CompleteQuizButton
        runner={runner}
        allAnswered={allAnswered}
        remainingCount={totalQuestions - answeredCount}
        onNavigateToUnanswered={() => {
          const firstUnanswered = runner.questions.findIndex(
            (q) => !isQuestionAnswered(q.questionId),
          );
          if (firstUnanswered !== -1) {
            setActiveQuestionIndex(firstUnanswered);
          }
        }}
      />

      <AttemptAbandonDialog
        open={abandonOpen}
        typedConfirmRequired={false}
        onConfirm={async () => {
          await runner.abandon();
          setAbandonOpen(false);
        }}
        onCancel={() => setAbandonOpen(false)}
        isPending={runner.status === "abandoning"}
      />
    </div>
  );
}

function AttemptRunnerActiveQuestion({
  runner,
  activeIndex,
  onNext,
  onPrevious,
}: {
  runner: ReturnType<typeof useAttemptRunner>;
  activeIndex: number;
  onNext: () => void;
  onPrevious: () => void;
}): React.ReactElement {
  const { questions, drafts, submittedAnswers, updateDraft, selectAnswer } =
    runner;
  const total = questions.length;

  if (runner.totalQuestions === 0 || total === 0) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid="attempt-runner-no-questions"
      >
        This quiz has no questions.
      </p>
    );
  }

  const safeIndex = Math.min(Math.max(activeIndex, 0), total - 1);
  const question = questions[safeIndex]!;
  const isSubmitted = Boolean(submittedAnswers[question.questionId]);
  const draft = drafts[question.questionId] ?? null;

  return (
    <div className="space-y-4">
      <AttemptQuestionCard
        key={question.questionId}
        question={question}
        index={safeIndex + 1}
        total={total}
        value={draft}
        onChange={(selection) => {
          updateDraft(selection);
          void selectAnswer(question, selection);
        }}
        isSubmitted={isSubmitted}
        isPending={false}
        errorMessage={null}
      />

      {total > 1 && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            size="default"
            disabled={safeIndex === 0}
            onClick={onPrevious}
            data-testid="attempt-runner-previous"
            className="rounded-xl px-5 cursor-pointer"
          >
            Previous
          </Button>

          <span className="text-xs font-mono text-muted-foreground">
            {safeIndex + 1} / {total}
          </span>

          <Button
            type="button"
            variant="outline"
            size="default"
            disabled={safeIndex >= total - 1}
            onClick={onNext}
            data-testid="attempt-runner-next"
            className="rounded-xl px-5 cursor-pointer"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function CompleteQuizButton({
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
  const { push } = useToast();

  const handleSubmit = async () => {
    if (!allAnswered) {
      onNavigateToUnanswered?.();
      return;
    }
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

  return (
    <div className="sticky bottom-3 z-20 bg-card/95 backdrop-blur-md p-4 border border-border/80 rounded-2xl shadow-lg mt-2">
      <Button
        type="button"
        variant="default"
        size="lg"
        className="w-full bg-brand text-white hover:bg-brand-hover rounded-xl font-semibold py-3 shadow-sm hover:shadow-brand/20 transition-all cursor-pointer"
        disabled={isSubmitting || !allAnswered}
        onClick={handleSubmit}
        data-testid="attempt-runner-submit-quiz"
      >
        {isSubmitting ? "Submitting..." : "Submit Quiz"}
      </Button>
      {remainingCount > 0 && (
        <p className="text-xs text-muted-foreground text-center mt-2 font-mono">
          {remainingCount} question{remainingCount !== 1 ? "s" : ""} remaining
        </p>
      )}
    </div>
  );
}

function RunnerSkeleton(): React.ReactElement {
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
