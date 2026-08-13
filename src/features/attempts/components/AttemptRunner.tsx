'use client';

/**
 * `AttemptRunner` — player-facing attempt runner composition.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.20.
 *
 * ## Purpose
 *
 * Thin composition layer over `useAttemptRunner`. Renders:
 *
 *   - Stable skeleton during start / hydration.
 *   - All questions at once in a scrollable list.
 *   - A "Submit Quiz" button that submits all answers at once.
 *   - Progress indicator showing answered questions.
 *   - The typed-confirm `<AttemptAbandonDialog />` and the
 *     `<AttemptHeader />` header with status copy.
 *
 * ## What this component does NOT own
 *
 *   - No service / SWR / store / router direct imports.
 *   - No completion / score / result logic (reserved for 4.15).
 *   - No author DTO consumption.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/lib/forms/useToast';
import { ApiError } from '@/lib/api';
import { getUserCopy } from '@/lib/api/error-codes';

import {
  useAttemptRunner,
  type UseAttemptRunnerParams,
} from '@/features/attempts/hooks/useAttemptRunner';

import {
  AttemptAbandonDialog,
  AttemptHeader,
  AttemptQuestionCard,
} from '@/features/attempts/components';

// ─── Public types ────────────────────────────────────────────────────────────

export type AttemptRunnerProps = UseAttemptRunnerParams;

// ─── Component ───────────────────────────────────────────────────────────────

export function AttemptRunner(
  props: AttemptRunnerProps,
): React.ReactElement {
  const runner = useAttemptRunner(props);
  const router = useRouter();
  const { push } = useToast();

  // Local state for the typed-confirm dialog.
  const [abandonOpen, setAbandonOpen] = React.useState(false);

  // ─── Side effects: react to navigation intents ───────────────────────────
  React.useEffect(() => {
    if (!runner.navigation) return;
    const intent = runner.navigation;
    if (intent.kind === 'push_attempt') {
      router.push(intent.href);
    } else if (intent.kind === 'push_quiz') {
      router.push(intent.href);
    } else if (intent.kind === 'replace_login') {
      router.replace(intent.href);
    }
    runner.consumeNavigation();
  }, [runner, router]);

  // ─── Side effects: surface error toasts ─────────────────────────────────
  React.useEffect(() => {
    if (!runner.error) return;
    const code = (runner.error as ApiError).code;
    const copy = getUserCopy(code ?? 'ATTEMPT_UNKNOWN');
    push({
      title: copy.title,
      body: copy.body,
      durationMs: 5000,
    });
  }, [runner.error, push]);

  // ─── Render branches ────────────────────────────────────────────────────
  if (!runner.hasHydrated && runner.isActiveLoading) {
    return <RunnerSkeleton />;
  }

  if (runner.status === 'idle' && !runner.activeAttempt) {
    return (
      <div
        className="mx-auto max-w-3xl p-4 text-sm text-muted-foreground"
        data-testid="attempt-runner-no-active"
      >
        No active attempt. Return to the quiz page to start one.
      </div>
    );
  }

  if (runner.status === 'abandoned') {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 p-4"
        data-testid="attempt-runner-abandoned"
      >
        <AttemptHeader
          title={props.idOrSlug ?? 'Attempt'}
          status="abandoned"
          onAbandon={() => undefined}
        />
        <p className="text-sm text-muted-foreground">
          This attempt was abandoned. You can return to the quiz page to start a new attempt.
        </p>
      </div>
    );
  }

  if (runner.status === 'completed') {
    return (
      <div
        className="mx-auto max-w-3xl p-4 text-sm text-muted-foreground"
        data-testid="attempt-runner-completed"
      >
        Attempt completed. Results will be available shortly.
      </div>
    );
  }

  // ─── In-progress / starting / submitting / abandoning ──────────────────
  const answeredCount = Object.keys(runner.submittedAnswers).length;
  const totalQuestions = runner.totalQuestions;

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4"
      data-testid="attempt-runner"
    >
      <AttemptHeader
        title={props.idOrSlug ?? 'Attempt'}
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
            style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* All questions */}
      <AttemptRunnerQuestions runner={runner} />

      {/* Submit Quiz button */}
      <CompleteQuizButton runner={runner} />

      <AttemptAbandonDialog
        open={abandonOpen}
        onConfirm={async () => {
          await runner.abandon();
          setAbandonOpen(false);
        }}
        onCancel={() => setAbandonOpen(false)}
        isPending={runner.status === 'abandoning'}
      />
    </div>
  );
}

// ─── Sub-component: all questions list ─────────────────────────────────────

function AttemptRunnerQuestions({
  runner,
}: {
  runner: ReturnType<typeof useAttemptRunner>;
}): React.ReactElement {
  const { questions, drafts, submittedAnswers, updateDraft, selectAnswer } = runner;

  if (runner.totalQuestions === 0 || questions.length === 0) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid="attempt-runner-no-questions"
      >
        This quiz has no questions.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((question, index) => {
        const isSubmitted = Boolean(submittedAnswers[question.questionId]);
        const draft = drafts[question.questionId] ?? null;

        return (
          <AttemptQuestionCard
            key={question.questionId}
            question={question}
            index={index + 1}
            total={questions.length}
            value={draft}
            onChange={(selection) => {
              // Update draft locally
              updateDraft(selection);
              // Auto-submit the answer
              void selectAnswer(question, selection);
            }}
            isSubmitted={isSubmitted}
            isPending={false}
            errorMessage={null}
          />
        );
      })}
    </div>
  );
}

// ─── Sub-component: complete quiz button ──────────────────────────────────────

function CompleteQuizButton({
  runner,
}: {
  runner: ReturnType<typeof useAttemptRunner>;
}): React.ReactElement {
  const { questions, submittedAnswers, completeQuiz } = runner;
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { push } = useToast();

  const answeredCount = Object.keys(submittedAnswers).length;
  const totalQuestions = questions.length;
  const allAnswered = answeredCount >= totalQuestions && totalQuestions > 0;
  const remainingCount = totalQuestions - answeredCount;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await completeQuiz();
    } catch (error) {
      const code = (error as ApiError)?.code;
      const copy = getUserCopy(code ?? 'ATTEMPT_UNKNOWN');
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
    <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 p-4 border-t">
      <Button
        type="button"
        variant="default"
        size="lg"
        className="w-full"
        disabled={isSubmitting || !allAnswered}
        onClick={handleSubmit}
        data-testid="attempt-runner-submit-quiz"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
      </Button>
      {remainingCount > 0 && (
        <p className="text-sm text-muted-foreground text-center mt-2">
          {remainingCount} question{remainingCount !== 1 ? 's' : ''} remaining
        </p>
      )}
    </div>
  );
}

// ─── Sub-component: stable skeleton ─────────────────────────────────────────

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