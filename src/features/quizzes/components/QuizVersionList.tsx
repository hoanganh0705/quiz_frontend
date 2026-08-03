/**
 * `QuizVersionList` — paginated list of quiz versions.
 *
 * Source epic:   Epic 4.9 — Quiz version lifecycle + edit version metadata.
 * Source ticket: TKT-4.9.9 (enhanced with TKT-4.9.12, TKT-4.9.19, TKT-4.9.20).
 *
 * ## What this component renders
 *
 * - List of `<QuizVersionListItem>` components
 * - "Load more" button for infinite scroll
 * - Empty states with CTAs
 * - Loading skeletons
 *
 * ## What this component does NOT own
 *
 * - Data fetching — parent passes in versions
 * - Version actions — parent passes in callbacks
 */

'use client';

import { memo } from 'react';

import { FileQuestion, Plus, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

import { QuizVersionListItem } from './QuizVersionListItem';
import type { QuizVersionSummary } from '@/features/quizzes/types/quiz-version.types';

export interface QuizVersionListProps {
  /** List of versions to render. */
  versions: readonly QuizVersionSummary[];
  /** Currently active version ID. */
  activeVersionId: string | null;
  /** Called when user selects a version. */
  onSelectVersion: (versionId: string) => void;
  /** `true` while loading more. */
  isLoading?: boolean;
  /** `true` if there are more pages. */
  hasMore?: boolean;
  /** Called when user wants to load more. */
  onLoadMore?: () => void;
  /** Called when user clicks "Create first draft" (empty state). */
  onCreateFirstDraft?: () => void;
  /** `true` while creating first draft. */
  isCreatingDraft?: boolean;
  /** Called when user clicks "Edit". */
  onEdit?: (versionId: string) => void;
  /** Called when user clicks "Add questions". */
  onAddQuestions?: (versionId: string) => void;
  /** Called when user clicks "Publish". */
  onPublish?: (versionId: string) => void;
  /** Called when user confirms delete. */
  onDelete?: (versionId: string) => void;
  /** Whether a version is ready to publish (has 5+ questions). */
  isVersionReadyToPublish?: (version: QuizVersionSummary) => boolean;
  /** ID of version being deleted. */
  deletingVersionId?: string | null;
  /** Optional extra className. */
  className?: string;
}

// ─── Empty States ────────────────────────────────────────────────────────────

interface EmptyStateProps {
  isEmpty: boolean;
  hasDrafts: boolean;
  onCreateDraft: () => void;
  isCreatingDraft: boolean;
}

function VersionListEmptyState({
  isEmpty,
  hasDrafts,
  onCreateDraft,
  isCreatingDraft,
}: EmptyStateProps): React.ReactElement {
  // Zero versions (edge case - quiz was just created)
  if (isEmpty) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center"
        data-testid="version-list-empty"
      >
        <div className="mb-4 rounded-full bg-muted p-3">
          <FileQuestion className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          No versions yet. Create your first draft to get started.
        </p>
        <Button
          type="button"
          size="sm"
          onClick={onCreateDraft}
          disabled={isCreatingDraft}
          data-testid="create-first-draft-btn"
        >
          {isCreatingDraft ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Creating…
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Create first draft
            </>
          )}
        </Button>
      </div>
    );
  }

  // Has versions but no drafts (only published)
  if (!hasDrafts) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center"
        data-testid="version-list-no-drafts"
      >
        <div className="mb-4 rounded-full bg-muted p-3">
          <FileQuestion className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          No drafts. Create one to make changes to the published quiz.
        </p>
        <Button
          type="button"
          size="sm"
          onClick={onCreateDraft}
          disabled={isCreatingDraft}
          data-testid="create-draft-btn"
        >
          {isCreatingDraft ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Creating…
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Create draft
            </>
          )}
        </Button>
      </div>
    );
  }

  // No items in current tab (e.g., "Published" tab but no published versions)
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center"
      data-testid="version-list-empty-tab"
    >
      <div className="mb-4 rounded-full bg-muted p-3">
        <FileQuestion className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm text-muted-foreground">
        No versions in this category.
      </p>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function VersionListSkeleton(): React.ReactElement {
  return (
    <div
      className="space-y-3"
      aria-busy="true"
      aria-label="Loading versions"
      data-testid="version-list-skeleton"
    >
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

/**
 * `<QuizVersionList />` — renders the version list with empty states and loading.
 *
 * @example
 * ```tsx
 * <QuizVersionList
 *   versions={versions}
 *   activeVersionId={activeId}
 *   onSelectVersion={(id) => setActiveVersionId(id)}
 *   onCreateFirstDraft={() => createDraft()}
 *   onEdit={(id) => router.push(`/edit?version=${id}`)}
 *   onAddQuestions={(id) => router.push(`/versions/${id}/questions`)}
 *   onPublish={(id) => publish(id)}
 *   onDelete={(id) => deleteVersion(id)}
 *   isVersionReadyToPublish={(v) => (v.questions?.length ?? 0) >= 5}
 *   isLoading={isLoading}
 *   hasMore={hasNextPage}
 *   onLoadMore={loadMore}
 * />
 * ```
 */
export const QuizVersionList = memo(function QuizVersionList({
  versions,
  activeVersionId,
  onSelectVersion,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onCreateFirstDraft,
  isCreatingDraft = false,
  onEdit,
  onAddQuestions,
  onPublish,
  onDelete,
  isVersionReadyToPublish,
  deletingVersionId,
  className,
}: QuizVersionListProps): React.ReactElement {
  const isEmpty = versions.length === 0;
  const hasDrafts = versions.some((v) => v.status === 'draft');

  // Loading skeleton
  if (isLoading && isEmpty) {
    return (
      <div className={className} data-testid="quiz-version-list">
        <VersionListSkeleton />
      </div>
    );
  }

  // Empty states
  if (isEmpty || (!hasDrafts && onCreateFirstDraft)) {
    return (
      <div className={className} data-testid="quiz-version-list">
        <VersionListEmptyState
          isEmpty={isEmpty}
          hasDrafts={hasDrafts}
          onCreateDraft={onCreateFirstDraft ?? (() => {})}
          isCreatingDraft={isCreatingDraft}
        />
      </div>
    );
  }

  return (
    <div
      className={`space-y-2 ${className ?? ''}`}
      data-testid="quiz-version-list"
      role="list"
      aria-label="Quiz versions"
    >
      {versions.map((version) => (
        <QuizVersionListItem
          key={version.quizVersionId}
          version={version}
          isActive={version.quizVersionId === activeVersionId}
          onSelect={() => onSelectVersion(version.quizVersionId)}
          onEdit={onEdit ? () => onEdit(version.quizVersionId) : undefined}
          onAddQuestions={onAddQuestions ? () => onAddQuestions(version.quizVersionId) : undefined}
          onPublish={onPublish ? () => onPublish(version.quizVersionId) : undefined}
          onDelete={onDelete ? () => onDelete(version.quizVersionId) : undefined}
          isReadyToPublish={isVersionReadyToPublish?.(version) ?? false}
          isDeleting={deletingVersionId === version.quizVersionId}
        />
      ))}

      {/* Load more */}
      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoading}
            data-testid="load-more-versions"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Loading…
              </>
            ) : (
              'Load more'
            )}
          </Button>
        </div>
      )}
    </div>
  );
});
