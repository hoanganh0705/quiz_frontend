'use client';

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

export interface AttemptRunnerPageProps {
idOrSlug: string;
}

export function AttemptRunnerPage(
props: AttemptRunnerPageProps,
): React.ReactElement {
const { idOrSlug } = props;
const returnTo = `/quizzes/${encodeURIComponent(idOrSlug)}/attempt`;
const { isAuthenticated, isBootstrapping } = useAuthSession();

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

function AttemptRunnerInner({ idOrSlug }: { idOrSlug: string }): React.ReactElement {
const router = useRouter();
const detail = useQuizByIdOrSlug(idOrSlug);
const { attempt: activeAttempt, isLoading: isActiveLoading } =
useActiveAttempt({ quizId: detail.quiz?.quizId ?? null });

const attemptsByQuizVersionId = useAttemptsStore(
(s) => s.attemptsByQuizVersionId,
  );

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

const questions: readonly QuizQuestionPlayerDto[] =
(publishedVersion?.questions ?? []) as unknown as readonly QuizQuestionPlayerDto[];

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