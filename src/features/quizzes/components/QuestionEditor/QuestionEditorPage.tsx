

'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notFound, useParams } from 'next/navigation';

import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { getUserCopy } from '@/lib/api/error-codes';
import { useToast } from '@/lib/forms/useToast';
import { addSentryBreadcrumb } from '@/shared/sentry/add-sentry-breadcrumb';

import {
useQuizAuthorView,
useQuizVersion,
useVersionQuestions,
} from '@/features/quizzes/hooks';

import { QuestionEditor } from './QuestionEditor';

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

export const QuestionEditorPage = memo(function QuestionEditorPage(): React.ReactElement {
const params = useParams();
const router = useRouter();
const { push } = useToast();

const quizId = (params.id as string | undefined) ?? null;
const versionId = (params.versionId as string | undefined) ?? null;

const showToast = useCallback(
(title: string, body: string) => {
push({ title, body, durationMs: 5000 });
    },
[push],
  );

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

useEffect(() => {
if (quizError?.status === 403) {
addSentryBreadcrumb(
'error',
'User forbidden from editing quiz',
{ errorCode: quizError.code, status: 403 },
{ categoryPrefix: 'question-editor', quizId, versionId },
      );
      // Access denied banner will be shown
    }
  }, [quizError, quizId, versionId]);

if (!quizId || !versionId) {
notFound();
  }

if (!isLoadingQuiz && !quiz && !quizError) {
notFound();
  }

if (versionNotFound) {
notFound();
  }

if (isLoadingQuiz || isLoadingVersion || isLoadingQuestions || !quizId || !versionId) {
return <QuestionEditorPageSkeleton />;
  }

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

const questionCount = questions.length;
const publishReadiness = {
current: questionCount,
required: 5,
isReady: questionCount >= 5,
  };

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
addSentryBreadcrumb(
'error',
'Question editor error',
{ code: error.code },
{ categoryPrefix: 'question-editor', quizId, versionId },
            );
          }}
        />
      )}
</div>
  );
});
