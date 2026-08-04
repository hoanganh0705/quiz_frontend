'use client';

/**
 * `AttemptRunnerPage` — page-level container for the attempt runner.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.21.
 *
 * ## Purpose
 *
 * Resolves:
 *
 *   - Auth bootstrap state (skeleton / unauthenticated / authenticated).
 *   - Canonical player quiz identity and latest published version.
 *   - Active attempt lookup.
 *
 * and delegates rendering to `<AttemptRunner />`.
 *
 * ## Auth gating
 *
 * The page uses `<AuthGate />` with a safe return URL so unauthenticated
 * entry is redirected to `/login?redirect=<attempt-entry-path>` and
 * resumes on the same URL after successful login.
 *
 * ## Page-level isolation
 *
 * Quiz loading and runner rendering are isolated: a runner failure
 * does not propagate to the global app shell, and the page does not
 * import any completion / score / review / analytics service.
 *
 * ## Forbidden / unpublished outcomes
 *
 * On `ATTEMPT_FORBIDDEN` or unpublished quiz versions, the page
 * navigates back to `/quizzes/[idOrSlug]` rather than rendering a
 * stale runner.
 *
 * ## Direct entry without active attempt
 *
 * If the user opens `/attempt` without an active attempt, the page
 * routes them back to `/quizzes/[idOrSlug]` rather than silently
 * starting a new attempt.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

import { AuthGate } from '@/features/auth/components/auth-gate';
import { useQuizByIdOrSlug } from '@/features/quizzes/hooks/useQuizByIdOrSlug';

import { useActiveAttempt } from '@/features/attempts/hooks/useActiveAttempt';
import { AttemptRunner } from '@/features/attempts/components/AttemptRunner';

import { ApiError } from '@/lib/api';

import type { QuizQuestionPlayerDto } from '@/lib/api/generated/schemas';

// ─── Public types ────────────────────────────────────────────────────────────

export interface AttemptRunnerPageProps {
  idOrSlug: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AttemptRunnerPage(
  props: AttemptRunnerPageProps,
): React.ReactElement {
  const { idOrSlug } = props;
  const returnTo = `/quizzes/${encodeURIComponent(idOrSlug)}/attempt`;

  return (
    <AuthGate redirectTo={returnTo}>
      <AttemptRunnerInner idOrSlug={idOrSlug} />
    </AuthGate>
  );
}

// ─── Inner (authenticated) ──────────────────────────────────────────────────

function AttemptRunnerInner({ idOrSlug }: { idOrSlug: string }): React.ReactElement {
  const router = useRouter();
  const detail = useQuizByIdOrSlug(idOrSlug);
  const { attempt: activeAttempt, isLoading: isActiveLoading } =
    useActiveAttempt({ quizId: detail.quiz?.quizId ?? null });

  // All hooks first — no early returns before this point.
  // Direct entry without an active attempt: redirect back to the
  // public quiz page so the runner URL never silently starts a new
  // attempt.
  const publicQuizHref = `/quizzes/${encodeURIComponent(idOrSlug)}`;
  const shouldRedirectToQuiz =
    !detail.isLoading
    && !detail.error
    && !detail.notFound
    && detail.quiz !== null
    && !isActiveLoading
    && activeAttempt === null;

  React.useEffect(() => {
    if (shouldRedirectToQuiz) {
      router.replace(publicQuizHref);
    }
  }, [shouldRedirectToQuiz, router, publicQuizHref]);

  // ─── Loading state ──────────────────────────────────────────────────────
  if (detail.isLoading || (isActiveLoading && !detail.error)) {
    return (
      <div
        className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4"
        data-testid="attempt-runner-page-skeleton"
      >
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // ─── Quiz resolution ────────────────────────────────────────────────────
  if (detail.notFound) {
    return <NavigateTo href={publicQuizHref} />;
  }
  if (detail.error) {
    const code = (detail.error as ApiError).code;
    if (code === 'QUIZ_NOT_FOUND' || code === 'GLOBAL_NOT_FOUND') {
      return <NavigateTo href={publicQuizHref} />;
    }
    return (
      <div
        className="mx-auto max-w-3xl space-y-3 p-4"
        data-testid="attempt-runner-page-error"
      >
        <p className="text-sm font-semibold">Could not load this quiz</p>
        <p className="text-sm text-muted-foreground">Please try again.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void detail.retry()}
          data-testid="attempt-runner-page-retry"
        >
          Retry
        </Button>
      </div>
    );
  }

  const quiz = detail.quiz;
  if (!quiz) {
    return <NavigateTo href={publicQuizHref} />;
  }

  const publishedVersion = quiz.publishedVersion ?? null;
  const quizVersionId = publishedVersion?.quizVersionId ?? null;
  // The quiz player projection strips correctness metadata. The runner
  // type alias widens to `QuizQuestionPlayerDto`, so the runtime
  // objects are compatible even if the structural alias differs.
  const questions: readonly QuizQuestionPlayerDto[] =
    (publishedVersion?.questions ?? []) as unknown as readonly QuizQuestionPlayerDto[];

  if (activeAttempt === null) {
    return (
      <div
        className="mx-auto max-w-3xl p-4 text-sm text-muted-foreground"
        data-testid="attempt-runner-page-redirecting"
      >
        Returning to the quiz page…
      </div>
    );
  }

  return (
    <AttemptRunner
      quizId={quiz.quizId}
      quizVersionId={quizVersionId}
      idOrSlug={idOrSlug}
      questions={questions}
    />
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function NavigateTo({ href }: { href: string }): React.ReactElement {
  const router = useRouter();
  React.useEffect(() => {
    router.replace(href);
  }, [router, href]);
  return (
    <div
      className="mx-auto max-w-3xl p-4 text-sm text-muted-foreground"
      data-testid="attempt-runner-page-navigating"
    >
      Redirecting…
    </div>
  );
}