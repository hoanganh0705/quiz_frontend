

'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notFound, useParams } from 'next/navigation';

import { getUserCopy } from '@/lib/api/error-codes';
import { useToast } from '@/lib/forms/useToast';
import { Skeleton } from '@/components/ui/Skeleton';
import { addSentryBreadcrumb } from '@/shared/sentry/add-sentry-breadcrumb';

import {
useQuizAuthorView,
useQuizVersions,
useQuizVersion,
useCreateVersion,
useUpdateVersion,
usePublishVersion,
usePublishReadiness,
} from '@/features/quizzes/hooks';

import { QuizEditHeader } from './QuizEditHeader';
import { QuizVersionTabs } from './QuizVersionTabs';
import { QuizVersionList } from './QuizVersionList';
import { VersionImmutableBanner } from './VersionImmutableBanner';
import { QuizEditForm } from './QuizEditForm';
import { PublishReadinessBanner } from './PublishReadinessBanner';
import { PublishConfirmDialog } from './PublishConfirmDialog';
import { EditPublishedQuizCTA } from './EditPublishedQuizCTA';

type VersionTab = 'drafts' | 'published';

export interface QuizEditPageProps {

quizId?: string;
}

function QuizEditPageSkeleton(): React.ReactElement {
return (
<div className="space-y-8" aria-busy="true" aria-label="Loading quiz edit page">
{/* Header skeleton */}
<div className="space-y-3">
<Skeleton className="h-4 w-36" />
<Skeleton className="h-8 w-64" />
</div>

{/* Tabs skeleton */}
<div className="flex items-center gap-4 border-b border-border">
<Skeleton className="h-9 w-20" />
<Skeleton className="h-9 w-24" />
</div>

{/* Layout: sidebar + main content */}
<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
{/* Version list (sidebar) */}
<div className="lg:col-span-1 space-y-3">
<Skeleton className="h-24 w-full rounded-lg" />
<Skeleton className="h-24 w-full rounded-lg" />
<Skeleton className="h-24 w-full rounded-lg" />
</div>

{/* Form (main content) */}
<div className="lg:col-span-2 space-y-4">
<Skeleton className="h-20 w-full rounded-lg" />
<Skeleton className="h-10 w-full" />
<Skeleton className="h-10 w-full" />
<Skeleton className="h-10 w-1/2" />
<Skeleton className="h-10 w-32" />
</div>
</div>
</div>
  );
}

export const QuizEditPage = memo(function QuizEditPage({
quizId: quizIdProp,
}: QuizEditPageProps): React.ReactElement {
const params = useParams();
const router = useRouter();
const { push } = useToast();

const quizId = quizIdProp ?? (params.id as string | undefined) ?? null;

const [activeTab, setActiveTab] = useState<VersionTab>('drafts');

const [activeVersionId, setActiveVersionId] = useState<string | null>(null);

const [versionNotFoundError, setVersionNotFoundError] = useState(false);
const [slugConflictError, setSlugConflictError] = useState<string | null>(null);

const [showPublishConfirm, setShowPublishConfirm] = useState(false);

const showToast = useCallback(
(title: string, body: string) => {
push({ title, body, durationMs: 5000 });
    },
[push]
  );

const {
data: quiz,
isLoading: isLoadingQuiz,
error: quizError,
notFound: quizNotFound,
  } = useQuizAuthorView(quizId);

const versionsResult = useQuizVersions({ quizId: quizId ?? '', limit: 20 });

const {
data: activeVersion,
isLoading: isLoadingActiveVersion,
error: activeVersionError,
notFound: activeVersionNotFound,
isDraft: activeVersionIsDraft,
retry: retryActiveVersion,
  } = useQuizVersion(quizId, activeVersionId);

const {
createVersion,
isLoading: isCreatingVersion,
error: createVersionError,
  } = useCreateVersion({
onSuccess: (version) => {
addSentryBreadcrumb(
'user-action',
'Created new quiz version',
{
versionId: version.quizVersionId,
versionNumber: version.versionNumber,
        },
{ categoryPrefix: 'quiz-edit', quizId },
      );

setActiveTab('drafts');
setActiveVersionId(version.quizVersionId);

void versionsResult.refresh();
    },
  });

const {
updateVersion,
isLoading: isUpdatingVersion,
error: updateVersionError,
  } = useUpdateVersion({
onSuccess: () => {
addSentryBreadcrumb(
'user-action',
'Updated quiz version metadata',
{},
{ categoryPrefix: 'quiz-edit', quizId },
      );
showToast('Changes saved', 'Your changes have been saved successfully.');
void versionsResult.refresh();
    },
  });

const {
publishVersion,
isLoading: isPublishing,
error: publishError,
resetError: resetPublishError,
  } = usePublishVersion({
onSuccess: (version) => {
addSentryBreadcrumb(
'user-action',
'Published quiz version',
{ versionId: version.quizVersionId },
{ categoryPrefix: 'quiz-edit', quizId },
      );
showToast('Published', 'Your quiz is now live on /quizzes!');
void versionsResult.refresh();

if (quiz?.slug) {
router.push(`/quizzes/${quiz.slug}`);
      }
    },
onError: (error) => {
addSentryBreadcrumb(
'error',
'Publish failed',
{ code: error.code, status: error.status },
{ categoryPrefix: 'quiz-edit', quizId },
      );
    },
  });

const questionCount = activeVersion?.questions?.length ?? 0;
const readiness = usePublishReadiness({ questionCount });

const handleSelectVersion = useCallback(
(versionId: string) => {
addSentryBreadcrumb(
'user-action',
'Selected version',
{ versionId },
{ categoryPrefix: 'quiz-edit', quizId },
      );
setActiveVersionId(versionId);
setVersionNotFoundError(false);
    },
[addSentryBreadcrumb]
  );

const handleNewVersion = useCallback(async () => {
if (!quizId) return;
addSentryBreadcrumb(
'user-action',
'Creating new version',
{},
{ categoryPrefix: 'quiz-edit', quizId },
    );
try {
await createVersion(quizId, {
difficulty: 'medium',
durationMs: 300_000,
passingScorePercent: 70,
rewardXp: 100,
      });
    } catch {
      // Error is handled by the hook
    }
  }, [quizId, createVersion, addSentryBreadcrumb]);

useEffect(() => {
if (versionsResult.items.length > 0 && !activeVersionId) {

const firstDraft = [...versionsResult.items].find((v) => v.status === 'draft');
if (firstDraft) {
setActiveVersionId(firstDraft.quizVersionId);
      } else if (versionsResult.items.length > 0) {

setActiveVersionId(versionsResult.items[0].quizVersionId);
      }
    }
  }, [versionsResult.items, activeVersionId]);

useEffect(() => {
if (quizError?.status === 403) {
addSentryBreadcrumb(
'error',
'User forbidden from editing quiz',
{ errorCode: quizError.code, status: 403 },
{ categoryPrefix: 'quiz-edit', quizId },
      );

const slug = quiz?.slug ?? params.id;
router.replace(`/quizzes/${slug}?reason=forbidden`);
    }
  }, [quizError, quiz, params.id, router, addSentryBreadcrumb]);

if (quizNotFound || (!isLoadingQuiz && !quiz && !quizError)) {
notFound();
  }

useEffect(() => {
if (activeVersionNotFound) {
addSentryBreadcrumb(
'error',
'Selected version not found',
{ versionId: activeVersionId },
{ categoryPrefix: 'quiz-edit', quizId },
      );
setVersionNotFoundError(true);
    }
  }, [activeVersionNotFound, activeVersionId, addSentryBreadcrumb]);

useEffect(() => {
if (updateVersionError?.code === 'QUIZ_VERSION_IMMUTABLE') {
addSentryBreadcrumb(
'error',
'Attempted to update immutable version',
{ versionId: activeVersionId },
{ categoryPrefix: 'quiz-edit', quizId },
      );

showToast(
'Version is locked',
'This version has been published and cannot be edited. Create a new draft to make changes.'
      );
    }
  }, [updateVersionError, activeVersionId, addSentryBreadcrumb, showToast]);

useEffect(() => {
if (updateVersionError?.code === 'QUIZ_SLUG_CONFLICT') {
addSentryBreadcrumb(
'error',
'Slug conflict on update',
{ errorCode: 'QUIZ_SLUG_CONFLICT' },
{ categoryPrefix: 'quiz-edit', quizId },
      );
setSlugConflictError(
'This URL slug is already in use. Please choose a different one.'
      );
    } else {
setSlugConflictError(null);
    }
  }, [updateVersionError, addSentryBreadcrumb]);

useEffect(() => {
const hasRateLimit =
createVersionError?.code === 'GLOBAL_RATE_LIMITED' ||
updateVersionError?.code === 'GLOBAL_RATE_LIMITED';
if (hasRateLimit) {
addSentryBreadcrumb(
'error',
'Rate limit hit',
{ code: 'GLOBAL_RATE_LIMITED' },
{ categoryPrefix: 'quiz-edit', quizId },
      );
showToast('Too many requests', 'Please wait a moment before trying again.');
    }
  }, [createVersionError, updateVersionError, addSentryBreadcrumb, showToast]);

useEffect(() => {
const hasServerError =
(createVersionError?.status ?? 0) >= 500 ||
(updateVersionError?.status ?? 0) >= 500;
if (hasServerError) {
const code =
createVersionError?.code ?? updateVersionError?.code ?? 'GLOBAL_INTERNAL_ERROR';
addSentryBreadcrumb(
'error',
'Server error',
{ code, status: 500 },
{ categoryPrefix: 'quiz-edit', quizId },
      );
showToast(
'Something went wrong',
'Please try again. If the problem persists, contact support.'
      );
    }
  }, [createVersionError, updateVersionError, addSentryBreadcrumb, showToast]);

useEffect(() => {
if (!publishError) return;

if (publishError.code === 'QUIZ_INSUFFICIENT_QUESTIONS') {
showToast(
'Cannot publish yet',
'Add at least 5 questions to publish this quiz.'
      );
    } else if (publishError.code === 'QUIZ_VERSION_IMMUTABLE') {
showToast(
'Version already published',
'Reloading to show the published state.'
      );
window.location.reload();
    } else if (publishError.code === 'GLOBAL_RATE_LIMITED') {
showToast('Too many requests', 'Please wait a moment before trying again.');
    } else if ((publishError.status ?? 0) >= 500) {
showToast(
'Something went wrong',
'Please try again. If the problem persists, contact support.'
      );
    } else {
const copy = getUserCopy(publishError.code);
showToast(copy.title, copy.body);
    }
  }, [publishError, showToast, router]);

useEffect(() => {
if (
updateVersionError &&
updateVersionError.code !== 'QUIZ_VERSION_IMMUTABLE' &&
updateVersionError.code !== 'QUIZ_SLUG_CONFLICT'
    ) {
addSentryBreadcrumb(
'error',
'Update version failed',
{ code: updateVersionError.code, status: updateVersionError.status },
{ categoryPrefix: 'quiz-edit', quizId },
      );
    }
  }, [updateVersionError, addSentryBreadcrumb]);

if (isLoadingQuiz || !quizId) {
return <QuizEditPageSkeleton />;
  }

const draftCount = versionsResult.items.filter((v) => v.status === 'draft').length;
const publishedCount = versionsResult.items.filter(
(v) => v.status === 'published'
  ).length;

const displayedVersions = versionsResult.items.filter((v) =>
activeTab === 'drafts' ? v.status === 'draft' : v.status === 'published'
  );

const isImmutableBannerShown =
activeVersion !== null &&
activeVersion.status === 'published' &&
activeVersionError === null;

const handleEdit = useCallback(
(versionId: string) => {
addSentryBreadcrumb(
'user-action',
'Edit version clicked',
{ versionId },
{ categoryPrefix: 'quiz-edit', quizId },
      );
setActiveVersionId(versionId);
    },
[addSentryBreadcrumb]
  );

const handleAddQuestions = useCallback(
(versionId: string) => {
addSentryBreadcrumb(
'user-action',
'Add questions clicked',
{ versionId },
{ categoryPrefix: 'quiz-edit', quizId },
      );

router.push(`/my-quizzes/${quizId}/versions/${versionId}/questions`);
    },
[addSentryBreadcrumb, router, quizId]
  );

const handlePublishClick = useCallback(() => {
addSentryBreadcrumb(
'user-action',
'Publish clicked',
{},
{ categoryPrefix: 'quiz-edit', quizId },
    );
setShowPublishConfirm(true);
  }, [addSentryBreadcrumb]);

const handlePublishConfirm = useCallback(async () => {
if (!quizId || !activeVersionId) return;
resetPublishError();
try {
await publishVersion(quizId, activeVersionId);
    } catch {
      // Error is handled by the hook's onError callback
    }
  }, [quizId, activeVersionId, publishVersion, resetPublishError]);

const handleDelete = useCallback(
(_versionId: string) => {
addSentryBreadcrumb(
'user-action',
'Delete version clicked',
{},
{ categoryPrefix: 'quiz-edit', quizId },
    );

showToast('Delete', 'Delete functionality is coming soon.');
    },
[addSentryBreadcrumb, showToast]
  );

return (
<div className="space-y-8" data-testid="quiz-edit-page">
{/* Version not found error banner */}
{versionNotFoundError && (
<div
className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
role="alert"
data-testid="version-not-found-banner"
        >
<p className="font-medium">Version not available</p>
<p>
This version is no longer available. Please select another version.
          </p>
</div>
      )}

{/* Create version error */}
{createVersionError && createVersionError.code !== 'GLOBAL_RATE_LIMITED' && (
<div
className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
role="alert"
data-testid="create-version-error"
        >
<p className="font-medium">Failed to create version</p>
<p>{getUserCopy(createVersionError.code).body}</p>
</div>
      )}

{/* Header */}
<QuizEditHeader
title={quiz?.title ?? 'Loading…'}
onNewVersion={handleNewVersion}
isCreatingVersion={isCreatingVersion}
canEdit={quizError === null}
      />

{/* Tabs */}
<QuizVersionTabs
activeTab={activeTab}
onTabChange={setActiveTab}
draftCount={draftCount}
publishedCount={publishedCount}
      />

{/* Version list + active form layout */}
<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
{/* Version list (left sidebar) */}
<div className="lg:col-span-1">
<QuizVersionList
versions={displayedVersions}
activeVersionId={activeVersionId}
onSelectVersion={handleSelectVersion}
isLoading={versionsResult.isLoading || versionsResult.isLoadingMore}
hasMore={versionsResult.hasMore}
onLoadMore={versionsResult.loadMore}
onCreateFirstDraft={handleNewVersion}
isCreatingDraft={isCreatingVersion}
onEdit={handleEdit}
onAddQuestions={handleAddQuestions}
onPublish={handlePublishClick}
onDelete={handleDelete}
isVersionReadyToPublish={(v) => (v.questions?.length ?? 0) >= 5}
          />
</div>

{/* Active version form (right panel) */}
<div className="lg:col-span-2">
{activeVersionId ? (
<>
{/* Immutable banner */}
{isImmutableBannerShown && (
<VersionImmutableBanner
onCreateNewDraft={handleNewVersion}
isCreating={isCreatingVersion}
                />
              )}

{/* Publish readiness banner — drafts only */}
{activeVersion && activeVersionIsDraft && (
<PublishReadinessBanner
questionCount={questionCount}
isReady={readiness.isReady}
onPublish={handlePublishClick}
onAddQuestions={() => handleAddQuestions(activeVersionId)}
isPublishing={isPublishing}
className="mb-4"
                />
              )}

{/* Version metadata form */}
{activeVersion && activeVersionIsDraft && (
<QuizEditForm
quizId={quizId}
versionId={activeVersionId}
initialData={activeVersion}
onSave={async (data) => {
try {
await updateVersion(quizId, activeVersionId, data);
                    } catch {
                      // Error is handled by the hook
                    }
                  }}
isSaving={isUpdatingVersion}
slugError={slugConflictError}
                />
              )}

{/* Published version view — show EditPublishedQuizCTA */}
{activeVersion && !activeVersionIsDraft && !isImmutableBannerShown && (
<EditPublishedQuizCTA
quizId={quizId}
version={activeVersion as unknown as import('@/features/quizzes/types/quiz-version.types').QuizVersionSummary}
onDraftCreated={(newVersion) => {

router.push(`/my-quizzes/${quizId}/edit?versionId=${newVersion.quizVersionId}`);
                  }}
onError={(error) => {
addSentryBreadcrumb(
'error',
'Failed to create draft from published version',
{
error: error instanceof Error ? error.message : String(error),
                      },
{ categoryPrefix: 'quiz-edit', quizId },
                    );
                  }}
className="mb-4"
                />
              )}
</>
          ) : (
<div className="rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center">
<p className="text-sm text-muted-foreground">
Select a version to view or edit its details.
              </p>
</div>
          )}
</div>
</div>

{/* Publish confirmation dialog */}
<PublishConfirmDialog
open={showPublishConfirm}
quizTitle={quiz?.title}
onConfirm={handlePublishConfirm}
onCancel={() => {
setShowPublishConfirm(false);
resetPublishError();
        }}
loading={isPublishing}
      />
</div>
  );
});
