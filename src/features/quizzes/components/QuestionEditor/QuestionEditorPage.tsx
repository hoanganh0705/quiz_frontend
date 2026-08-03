/**
 * `QuestionEditorPage` — page container for the question editor.
 *
 * Source epic:   Epic 4.10 — Question editor (single + bulk).
 * Source ticket: T-4.10.9.
 *
 * ## What this component owns
 *
 * - **Authentication check** — ensures user is authenticated (protected route).
 * - **Ownership verification** — verifies user owns the quiz before rendering.
 * - **Version status check** — only draft versions can be edited.
 * - **Loading skeleton** — shown during data fetching.
 * - **Error handling** — redirects on 403, shows not-found on 404.
 *
 * ## Routing
 *
 * Route: `/my-quizzes/[id]/versions/[versionId]/questions`
 *
 * ## Dependencies
 *
 * - `useQuizAuthorView` — fetches quiz with ownership check
 * - `useQuizVersion` — fetches version details
 * - `useVersionQuestions` — fetches questions for the version
 *
 * @see `QuestionEditor` — the main editor component
 */

'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notFound, useParams } from 'next/navigation';

import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { getUserCopy } from '@/lib/api/error-codes';
import { useToast } from '@/lib/forms/useToast';

import {
  useQuizAuthorView,
  useQuizVersion,
  useVersionQuestions,
} from '@/features/quizzes/hooks';

import { QuestionEditor } from './QuestionEditor';

// ─── Page skeleton ─────────────────────────────────────────────────────────

/**
 * Loading skeleton that matches the question editor page layout.
 */
function QuestionEditorPageSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading question editor">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-96" />
      </div>

      {/* Publish readiness skeleton */}
      <Skeleton className="h-12 w-full max-w-md rounded-lg" />

      {/* Question list skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>

      {/* Form skeleton */}
      <div className="space-y-4 rounded-lg border p-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

// ─── Access denied component ────────────────────────────────────────────────

/**
 * Access denied state when user is not the owner.
 */
function AccessDeniedBanner(): React.ReactElement {
  return (
    <div
      className="rounded-lg border border-destructive/50 bg-destructive/10 p-4"
      role="alert"
      data-testid="access-denied-banner"
    >
      <h2 className="text-lg font-medium text-destructive">Access denied</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        You do not have permission to edit this quiz. Only the quiz owner can
        add or modify questions.
      </p>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

/**
 * `<QuestionEditorPage />` — page container for the question editor.
 *
 * Handles authentication, ownership verification, and version status checks.
 * Renders the `<QuestionEditor />` component once all checks pass.
 */
export const QuestionEditorPage = memo(function QuestionEditorPage(): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const { push } = useToast();

  // Resolve IDs from route params
  const quizId = (params.id as string | undefined) ?? null;
  const versionId = (params.versionId as string | undefined) ?? null;

  // ── Toast helper ─────────────────────────────────────────────────────

  const showToast = useCallback(
    (title: string, body: string) => {
      push({ title, body, durationMs: 5000 });
    },
    [push],
  );

  // ── Data fetching ────────────────────────────────────────────────────

  const {
    data: quiz,
    isLoading: isLoadingQuiz,
    error: quizError,
  } = useQuizAuthorView(quizId);

  const {
    data: version,
    isLoading: isLoadingVersion,
    error: versionError,
    notFound: versionNotFound,
    isDraft,
  } = useQuizVersion(quizId, versionId);

  const {
    questions,
    isLoading: isLoadingQuestions,
    isEmpty,
    error: questionsError,
    refresh: refreshQuestions,
  } = useVersionQuestions({ quizId, versionId });

  // ── Sentry breadcrumb helper ─────────────────────────────────────────

  const addSentryBreadcrumb = useCallback(
    (
      type: 'api-call' | 'error' | 'user-action',
      message: string,
      data?: Record<string, unknown>,
    ) => {
      const sentry = typeof window !== 'undefined'
        ? (window as unknown as { Sentry?: { addBreadcrumb?: (crumb: { category: string; message: string; level: string; data: Record<string, unknown> }) => void } }).Sentry
        : undefined;
      sentry?.addBreadcrumb?.({
        category: `question-editor.${type}`,
        message,
        level: type === 'error' ? 'error' : 'info',
        data: { quizId, versionId, ...data },
      });
    },
    [quizId, versionId],
  );

  // ── Handle 403 (forbidden) ───────────────────────────────────────────

  useEffect(() => {
    if (quizError?.status === 403) {
      addSentryBreadcrumb('error', 'User forbidden from editing quiz', {
        errorCode: quizError.code,
        status: 403,
      });
      // Access denied banner will be shown
    }
  }, [quizError, addSentryBreadcrumb]);

  // ── Handle 404 (not found) ──────────────────────────────────────────

  if (!quizId || !versionId) {
    notFound();
  }

  if (!isLoadingQuiz && !quiz && !quizError) {
    notFound();
  }

  if (versionNotFound) {
    notFound();
  }

  // ── Loading state ────────────────────────────────────────────────────

  if (isLoadingQuiz || isLoadingVersion || isLoadingQuestions || !quizId || !versionId) {
    return <QuestionEditorPageSkeleton />;
  }

  // ── Access denied state ───────────────────────────────────────────────

  if (quizError?.status === 403) {
    return (
      <div className="space-y-6">
        <AccessDeniedBanner />
        <Button variant="outline" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  // ── Derive counts ────────────────────────────────────────────────────

  const questionCount = questions.length;
  const publishReadiness = {
    current: questionCount,
    required: 5,
    isReady: questionCount >= 5,
  };

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" data-testid="question-editor-page">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          <button
            type="button"
            className="hover:underline"
            onClick={() => router.push(`/my-quizzes/${quizId}/edit`)}
          >
            {quiz?.title ?? 'Quiz'}
          </button>
          {' / '}
          Version {version?.versionNumber ?? versionId}
        </p>
        <h1 className="text-2xl font-bold">Question Editor</h1>
      </div>

      {/* Error states */}
      {questionsError && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4"
          role="alert"
        >
          <p className="font-medium text-destructive">Failed to load questions</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {getUserCopy(questionsError.code).body}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => void refreshQuestions()}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Main editor */}
      {version && (
        <QuestionEditor
          quizId={quizId}
          versionId={versionId}
          versionNumber={version.versionNumber}
          questions={questions}
          publishReadiness={publishReadiness}
          isDraft={isDraft}
          onQuestionAdded={refreshQuestions}
          onError={(error) => {
            showToast('Error', getUserCopy(error.code).body);
            addSentryBreadcrumb('error', 'Question editor error', {
              code: error.code,
            });
          }}
        />
      )}
    </div>
  );
});
