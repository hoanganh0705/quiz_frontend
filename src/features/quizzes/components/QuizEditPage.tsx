/**
 * `QuizEditPage` — main orchestrating component for the quiz edit page.
 *
 * Source epic:   Epic 4.9 — Quiz version lifecycle + edit version metadata.
 * Source ticket: TKT-4.9.6 (enhanced with TKT-4.9.18, TKT-4.9.19, TKT-4.9.20).
 *
 * ## What this component owns
 *
 *   - **Data fetching** — calls `useQuizAuthorView`, `useQuizVersions`, and `useQuizVersion`
 *     for the quiz and its versions.
 *   - **Error handling** — redirects to public view on 403, shows NotFound on 404.
 *   - **Version tab state** — tracks which tab is active (Drafts / Published).
 *   - **Active version** — tracks which version is currently selected.
 *   - **Version creation** — handles "New version" CTA.
 *
 * ## What this component does NOT own
 *
 *   - **Version metadata form** — rendered by `<QuizEditForm />` (TKT-4.9.14).
 *   - **Version list** — rendered by `<QuizVersionList />` (TKT-4.9.9).
 *   - **Version tabs** — rendered by `<QuizVersionTabs />` (TKT-4.9.11).
 *   - **Header** — rendered by `<QuizEditHeader />` (TKT-4.9.7).
 */

'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notFound, useParams } from 'next/navigation';

import { getUserCopy } from '@/lib/api/error-codes';
import { useToast } from '@/lib/forms/useToast';
import { Skeleton } from '@/components/ui/Skeleton';

import {
  useQuizAuthorView,
  useQuizVersions,
  useQuizVersion,
  useCreateVersion,
  useUpdateVersion,
} from '@/features/quizzes/hooks';

import { QuizEditHeader } from './QuizEditHeader';
import { QuizVersionTabs } from './QuizVersionTabs';
import { QuizVersionList } from './QuizVersionList';
import { VersionImmutableBanner } from './VersionImmutableBanner';
import { QuizEditForm } from './QuizEditForm';

import type { QuizVersionSummary } from '@/features/quizzes/types/quiz-version.types';

// ─── Tab type ────────────────────────────────────────────────────────────────

type VersionTab = 'drafts' | 'published';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface QuizEditPageProps {
  /**
   * Optional override for the quiz ID (defaults to route params).
   * Useful for storybook / testing.
   */
  quizId?: string;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

/**
 * Loading skeleton that matches the edit page layout.
 */
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

// ─── Main component ─────────────────────────────────────────────────────────

/**
 * `<QuizEditPage />` — the quiz version lifecycle management page.
 *
 * Lists all versions, allows creating new drafts, and provides an edit form
 * for the active draft version.
 */
export const QuizEditPage = memo(function QuizEditPage({
  quizId: quizIdProp,
}: QuizEditPageProps): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const { push } = useToast();

  // Resolve quiz ID from props or route params
  const quizId = quizIdProp ?? (params.id as string | undefined) ?? null;

  // ── Tab state ────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState<VersionTab>('drafts');

  // ── Active version state ─────────────────────────────────────────────────

  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);

  // ── Error state (for non-redirect errors) ─────────────────────────────────

  const [versionNotFoundError, setVersionNotFoundError] = useState(false);
  const [slugConflictError, setSlugConflictError] = useState<string | null>(null);

  // ── Toast helper ─────────────────────────────────────────────────────────

  const showToast = useCallback(
    (title: string, body: string) => {
      push({ title, body, durationMs: 5000 });
    },
    [push]
  );

  // ── Sentry breadcrumb helper ─────────────────────────────────────────────

  const addSentryBreadcrumb = useCallback(
    (
      type: 'api-call' | 'error' | 'user-action',
      message: string,
      data?: Record<string, unknown>
    ) => {
      const sentry = typeof window !== 'undefined'
        ? (window as unknown as { Sentry?: { addBreadcrumb?: (crumb: { category: string; message: string; level: string; data: Record<string, unknown> }) => void } }).Sentry
        : undefined;
      sentry?.addBreadcrumb?.({
        category: `quiz-edit.${type}`,
        message,
        level: type === 'error' ? 'error' : 'info',
        data: { quizId, ...data },
      });
    },
    [quizId]
  );

  // ── Data fetching ────────────────────────────────────────────────────────

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

  // ── Version creation ─────────────────────────────────────────────────────

  const {
    createVersion,
    isLoading: isCreatingVersion,
    error: createVersionError,
  } = useCreateVersion({
    onSuccess: (version) => {
      addSentryBreadcrumb('user-action', 'Created new quiz version', {
        versionId: version.quizVersionId,
        versionNumber: version.versionNumber,
      });
      // Switch to drafts tab and select the new version
      setActiveTab('drafts');
      setActiveVersionId(version.quizVersionId);
      // Refresh the version list
      void versionsResult.refresh();
    },
  });

  // ── Version update ──────────────────────────────────────────────────────

  const {
    updateVersion,
    isLoading: isUpdatingVersion,
    error: updateVersionError,
  } = useUpdateVersion({
    onSuccess: () => {
      addSentryBreadcrumb('user-action', 'Updated quiz version metadata');
      showToast('Changes saved', 'Your changes have been saved successfully.');
      void versionsResult.refresh();
    },
  });

  // ── Handle version selection ──────────────────────────────────────────────

  const handleSelectVersion = useCallback(
    (versionId: string) => {
      addSentryBreadcrumb('user-action', 'Selected version', { versionId });
      setActiveVersionId(versionId);
      setVersionNotFoundError(false);
    },
    [addSentryBreadcrumb]
  );

  // ── Handle "New version" ────────────────────────────────────────────────

  const handleNewVersion = useCallback(async () => {
    if (!quizId) return;
    addSentryBreadcrumb('user-action', 'Creating new version');
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

  // ── Auto-select first draft when versions load ───────────────────────────

  useEffect(() => {
    if (versionsResult.items.length > 0 && !activeVersionId) {
      // Prefer the first draft
      const firstDraft = [...versionsResult.items].find((v) => v.status === 'draft');
      if (firstDraft) {
        setActiveVersionId(firstDraft.quizVersionId);
      } else if (versionsResult.items.length > 0) {
        // Fall back to first published version
        setActiveVersionId(versionsResult.items[0].quizVersionId);
      }
    }
  }, [versionsResult.items, activeVersionId]);

  // ── Handle 403 (forbidden) ───────────────────────────────────────────────

  useEffect(() => {
    if (quizError?.status === 403) {
      addSentryBreadcrumb('error', 'User forbidden from editing quiz', {
        errorCode: quizError.code,
        status: 403,
      });
      // Redirect to public view
      const slug = quiz?.slug ?? params.id;
      router.replace(`/quizzes/${slug}?reason=forbidden`);
    }
  }, [quizError, quiz, params.id, router, addSentryBreadcrumb]);

  // ── Handle 404 (quiz not found) ─────────────────────────────────────────

  if (quizNotFound || (!isLoadingQuiz && !quiz && !quizError)) {
    notFound();
  }

  // ── Handle version not found ─────────────────────────────────────────────

  useEffect(() => {
    if (activeVersionNotFound) {
      addSentryBreadcrumb('error', 'Selected version not found', {
        versionId: activeVersionId,
      });
      setVersionNotFoundError(true);
    }
  }, [activeVersionNotFound, activeVersionId, addSentryBreadcrumb]);

  // ── Handle 409 QUIZ_VERSION_IMMUTABLE from update ────────────────────────

  useEffect(() => {
    if (updateVersionError?.code === 'QUIZ_VERSION_IMMUTABLE') {
      addSentryBreadcrumb('error', 'Attempted to update immutable version', {
        versionId: activeVersionId,
      });
      // The VersionImmutableBanner is already shown, but we can add a toast
      showToast(
        'Version is locked',
        'This version has been published and cannot be edited. Create a new draft to make changes.'
      );
    }
  }, [updateVersionError, activeVersionId, addSentryBreadcrumb, showToast]);

  // ── Handle 409 QUIZ_SLUG_CONFLICT ──────────────────────────────────────

  useEffect(() => {
    if (updateVersionError?.code === 'QUIZ_SLUG_CONFLICT') {
      addSentryBreadcrumb('error', 'Slug conflict on update', {
        errorCode: 'QUIZ_SLUG_CONFLICT',
      });
      setSlugConflictError(
        'This URL slug is already in use. Please choose a different one.'
      );
    } else {
      setSlugConflictError(null);
    }
  }, [updateVersionError, addSentryBreadcrumb]);

  // ── Handle 429 rate limit ────────────────────────────────────────────────

  useEffect(() => {
    const hasRateLimit =
      createVersionError?.code === 'GLOBAL_RATE_LIMITED' ||
      updateVersionError?.code === 'GLOBAL_RATE_LIMITED';
    if (hasRateLimit) {
      addSentryBreadcrumb('error', 'Rate limit hit', {
        code: 'GLOBAL_RATE_LIMITED',
      });
      showToast('Too many requests', 'Please wait a moment before trying again.');
    }
  }, [createVersionError, updateVersionError, addSentryBreadcrumb, showToast]);

  // ── Handle 5xx server errors ─────────────────────────────────────────────

  useEffect(() => {
    const hasServerError =
      (createVersionError?.status ?? 0) >= 500 ||
      (updateVersionError?.status ?? 0) >= 500;
    if (hasServerError) {
      const code =
        createVersionError?.code ?? updateVersionError?.code ?? 'GLOBAL_INTERNAL_ERROR';
      addSentryBreadcrumb('error', 'Server error', { code, status: 500 });
      showToast(
        'Something went wrong',
        'Please try again. If the problem persists, contact support.'
      );
    }
  }, [createVersionError, updateVersionError, addSentryBreadcrumb, showToast]);

  // ── Handle update version errors ─────────────────────────────────────────

  useEffect(() => {
    if (
      updateVersionError &&
      updateVersionError.code !== 'QUIZ_VERSION_IMMUTABLE' &&
      updateVersionError.code !== 'QUIZ_SLUG_CONFLICT'
    ) {
      addSentryBreadcrumb('error', 'Update version failed', {
        code: updateVersionError.code,
        status: updateVersionError.status,
      });
    }
  }, [updateVersionError, addSentryBreadcrumb]);

  // ── Loading state ───────────────────────────────────────────────────────

  if (isLoadingQuiz || !quizId) {
    return <QuizEditPageSkeleton />;
  }

  // ── Derive counts ───────────────────────────────────────────────────────

  const draftCount = versionsResult.items.filter((v) => v.status === 'draft').length;
  const publishedCount = versionsResult.items.filter(
    (v) => v.status === 'published'
  ).length;

  // ── Filter versions by active tab ─────────────────────────────────────────

  const displayedVersions = versionsResult.items.filter((v) =>
    activeTab === 'drafts' ? v.status === 'draft' : v.status === 'published'
  );

  // ── Check if version has enough questions to publish ─────────────────────

  const isVersionReadyToPublish = useCallback(
    (version: QuizVersionSummary) => {
      const questionCount = (version as { questions?: unknown[] }).questions
        ?.length ?? 0;
      return questionCount >= 5;
    },
    []
  );

  // ── Compute isImmutable (for published version selected) ─────────────────

  const isImmutableBannerShown =
    activeVersion !== null &&
    activeVersion.status === 'published' &&
    activeVersionError === null;

  // ── Handle version actions ────────────────────────────────────────────────

  const handleEdit = useCallback(
    (versionId: string) => {
      addSentryBreadcrumb('user-action', 'Edit version clicked', { versionId });
      setActiveVersionId(versionId);
    },
    [addSentryBreadcrumb]
  );

  const handleAddQuestions = useCallback(
    (versionId: string) => {
      addSentryBreadcrumb('user-action', 'Add questions clicked', { versionId });
      // Navigate to question editor (stub for now)
      router.push(`/my-quizzes/${quizId}/versions/${versionId}/questions`);
    },
    [addSentryBreadcrumb, router, quizId]
  );

  const handlePublish = useCallback(
    (_versionId: string) => {
      addSentryBreadcrumb('user-action', 'Publish version clicked');
      // Publish action would be implemented here
      showToast('Publish', 'Publish functionality is coming soon.');
    },
    [addSentryBreadcrumb, showToast]
  );

  const handleDelete = useCallback(
    (_versionId: string) => {
      addSentryBreadcrumb('user-action', 'Delete version clicked');
      // Delete would be implemented here
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
            onPublish={handlePublish}
            onDelete={handleDelete}
            isVersionReadyToPublish={isVersionReadyToPublish}
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

              {/* Published version view (read-only) */}
              {activeVersion && !activeVersionIsDraft && !isImmutableBannerShown && (
                <div className="rounded-lg border border-muted p-6">
                  <div className="space-y-4">
                    <h2 className="text-lg font-medium">
                      Version {activeVersion.versionNumber}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      This version was published. To make changes, create a new
                      draft version.
                    </p>
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={handleNewVersion}
                    >
                      Create new draft version
                    </button>
                  </div>
                </div>
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
    </div>
  );
});
