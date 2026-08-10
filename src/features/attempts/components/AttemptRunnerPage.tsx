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
 * The page uses an inline auth gate (formerly the deleted
 * `<AuthGate />` component) with a safe return URL so unauthenticated
 * entry is redirected to `/login?redirect=<attempt-entry-path>` and
 * resumes on the same URL after successful login. The redirect is
 * driven off `useAuthSession` (the canonical replacement for the
 * dead `useAuthBootstrap`).
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

import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { redirectToLogin } from '@/features/auth/utils/auth-redirect';
import { useQuizByIdOrSlug } from '@/features/quizzes/hooks/useQuizByIdOrSlug';

import { useActiveAttempt } from '@/features/attempts/hooks/useActiveAttempt';
import { AttemptRunner } from '@/features/attempts/components/AttemptRunner';
import { useAttemptsStore } from '@/features/attempts/stores/useAttemptsStore';

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
  const { isAuthenticated, isBootstrapping } = useAuthSession();

  // Inline auth gate (formerly <AuthGate redirectTo={...}>).
  // The redirect is performed in an effect to avoid SSR-time
  // navigation; the bootstrap skeleton is rendered while the
  // cookie / profile hydration is in flight.
  React.useEffect(() => {
    if (!isBootstrapping && !isAuthenticated && typeof window !== 'undefined') {
      redirectToLogin(returnTo);
    }
  }, [isAuthenticated, isBootstrapping, returnTo]);

  if (isBootstrapping) {
    return (
      <div
        className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4"
        data-testid="attempt-runner-page-bootstrap"
      >
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4"
        data-testid="attempt-runner-page-redirect"
      >
        <Skeleton className="h-8 w-1/2" />
      </div>
    );
  }

  return <AttemptRunnerInner idOrSlug={idOrSlug} />;
}

// ─── Inner (authenticated) ──────────────────────────────────────────────────

function AttemptRunnerInner({ idOrSlug }: { idOrSlug: string }): React.ReactElement {
  const router = useRouter();
  const detail = useQuizByIdOrSlug(idOrSlug);
  const { attempt: activeAttempt, isLoading: isActiveLoading } =
    useActiveAttempt({ quizId: detail.quiz?.quizId ?? null });

  // Fresh-start signal: when `useStartAttempt` succeeds it writes
  // the new attempt to the runner store keyed by the canonical
  // quiz-version id (or the public quiz id when the version is not
  // yet resolved). The runner page subscribes to the reverse index
  // so it can short-circuit the "no active attempt → redirect" path
  // for the in-flight Start without waiting for the read-after-
  // write on `GET /users/me/attempts` to converge.
  const attemptsByQuizVersionId = useAttemptsStore(
    (s) => s.attemptsByQuizVersionId,
  );

  // All hooks first — no early returns before this point.
  // Direct entry without an active attempt: redirect back to the
  // public quiz page so the runner URL never silently starts a new
  // attempt. The fresh-start guard above exempts attempts that the
  // start hook just wrote — the runner then hydrates the entry via
  // `useAttemptHydration` once the detail hook resolves the
  // published version.
  const publicQuizHref = `/quizzes/${encodeURIComponent(idOrSlug)}`;
  const detailQuizId = detail.quiz?.quizId ?? null;
  const publishedQuizVersionId =
    detail.quiz?.publishedVersion?.quizVersionId ?? null;
  const hasFreshStart =
    (publishedQuizVersionId !== null
      && attemptsByQuizVersionId[publishedQuizVersionId] !== undefined)
    || (detailQuizId !== null
      && attemptsByQuizVersionId[detailQuizId] !== undefined);
  const shouldRedirectToQuiz =
    !detail.isLoading
    && !detail.error
    && !detail.notFound
    && detail.quiz !== null
    && !isActiveLoading
    && activeAttempt === null
    && !hasFreshStart;

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

  // When the runner store has a fresh-start entry for this quiz /
  // version, do NOT show the "Returning to the quiz page…" surface —
  // the start hook is in flight and the entry will hydrate shortly.
  // Render the bootstrap skeleton instead so the user sees a
  // consistent loading state during the read-after-write window.
  if (activeAttempt === null && hasFreshStart) {
    return (
      <div
        className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4"
        data-testid="attempt-runner-page-bootstrap"
      >
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

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