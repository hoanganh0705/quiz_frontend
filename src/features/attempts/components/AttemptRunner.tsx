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
 *   - Player-safe question list through `<AttemptQuestionCard />`.
 *   - Per-question pending feedback.
 *   - Navigation (previous / next) within valid bounds.
 *   - The typed-confirm `<AttemptAbandonDialog />` and the
 *     `<AttemptHeader />` header with status copy.
 *   - The reserved Story 4.15 completion handoff placeholder
 *     (no score / result / review).
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
import { cn } from '@/shared/utils/merge-class-names';

import {
  useAttemptRunner,
  type UseAttemptRunnerParams,
} from '@/features/attempts/hooks/useAttemptRunner';

import {
  AttemptAbandonDialog,
  AttemptHeader,
  AttemptProgressBar,
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

      <AttemptProgressBar
        totalQuestions={runner.totalQuestions}
        currentIndex={runner.currentIndex}
        submittedCount={Object.keys(runner.submittedAnswers).length}
      />

      <AttemptRunnerQuestions runner={runner} />

      <RunnerNav runner={runner} />

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

// ─── Sub-component: question list ──────────────────────────────────────────

function AttemptRunnerQuestions({
  runner,
}: {
  runner: ReturnType<typeof useAttemptRunner>;
}): React.ReactElement {
  if (runner.totalQuestions === 0 || !runner.currentQuestion) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid="attempt-runner-no-questions"
      >
        This quiz has no questions.
      </p>
    );
  }

  const q = runner.currentQuestion;
  const locked = runner.submittedAnswers[q.questionId];
  const submittedAt = (locked as unknown as { submittedAt?: string })?.submittedAt
    ?? null;
  return (
    <AttemptQuestionCard
      question={q}
      index={runner.currentIndex + 1}
      total={runner.totalQuestions}
      value={runner.draftSelection}
      onChange={runner.updateDraft}
      onSubmit={() => {
        void runner.submitCurrent();
      }}
      onWithdraw={() => {
        void runner.withdrawCurrent();
      }}
      isSubmitted={Boolean(locked)}
      isPending={runner.isSubmitting(q.questionId)}
      submittedAt={submittedAt}
      errorMessage={null}
    />
  );
}

// ─── Sub-component: navigation row ──────────────────────────────────────────

function RunnerNav({
  runner,
}: {
  runner: ReturnType<typeof useAttemptRunner>;
}): React.ReactElement {
  const atStart = runner.currentIndex <= 0;
  const atEnd = runner.currentIndex >= Math.max(runner.totalQuestions - 1, 0);
  return (
    <div
      className={cn('flex items-center justify-between')}
      data-testid="attempt-runner-nav"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={atStart}
        onClick={runner.previous}
        data-testid="attempt-runner-previous"
      >
        Previous
      </Button>
      <span className="text-xs text-muted-foreground">
        {runner.currentIndex + 1} / {runner.totalQuestions || 1}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={atEnd}
        onClick={runner.next}
        data-testid="attempt-runner-next"
      >
        Next
      </Button>
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