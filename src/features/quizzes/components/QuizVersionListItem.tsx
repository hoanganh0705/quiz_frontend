/**
 * `QuizVersionListItem` — a single version in the version list.
 *
 * Source epic:   Epic 4.9 — Quiz version lifecycle + edit version metadata.
 * Source ticket: TKT-4.9.10 (updated with TKT-4.9.12 actions menu).
 *
 * ## What this component renders
 *
 * - Version number badge (e.g., "v3")
 * - Status badge (Draft / Published)
 * - Title and question count
 * - Relative date
 * - Selection state
 * - Actions menu (for drafts)
 */

'use client';

import { memo } from 'react';

import { QuizVersionActionsMenu } from './QuizVersionActionsMenu';
import type { QuizVersionSummary } from '@/features/quizzes/types/quiz-version.types';

export interface QuizVersionListItemProps {
  /** The version to display. */
  version: QuizVersionSummary;
  /** `true` if this version is currently selected. */
  isActive?: boolean;
  /** Called when user selects this version. */
  onSelect?: () => void;
  /** Called when user clicks "Edit". */
  onEdit?: () => void;
  /** Called when user clicks "Add questions". */
  onAddQuestions?: () => void;
  /** Called when user clicks "Publish". */
  onPublish?: () => void;
  /** Called when user confirms delete. */
  onDelete?: () => void;
  /** `true` if the version has 5+ questions. */
  isReadyToPublish?: boolean;
  /** `true` while a delete is in progress. */
  isDeleting?: boolean;
  /** Optional extra className. */
  className?: string;
}

/**
 * Format a date string as relative time (e.g., "2 days ago").
 */
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * `<QuizVersionListItem />` — renders a single version row with optional actions.
 *
 * @example
 * ```tsx
 * <QuizVersionListItem
 *   version={version}
 *   isActive={activeVersionId === version.quizVersionId}
 *   onSelect={() => selectVersion(version.quizVersionId)}
 *   onEdit={() => editVersion()}
 *   onAddQuestions={() => router.push('/questions')}
 *   onPublish={() => publishVersion()}
 *   onDelete={() => deleteVersion()}
 *   isReadyToPublish={questionCount >= 5}
 * />
 * ```
 */
export const QuizVersionListItem = memo(function QuizVersionListItem({
  version,
  isActive = false,
  onSelect,
  onEdit,
  onAddQuestions,
  onPublish,
  onDelete,
  isReadyToPublish = false,
  isDeleting = false,
  className,
}: QuizVersionListItemProps): React.ReactElement {
  const isDraft = version.status === 'draft';
  const isPublished = version.status === 'published';

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't trigger select if clicking on the actions menu
    const target = e.target as HTMLElement;
    if (target.closest('[data-version-actions]')) {
      return;
    }
    onSelect?.();
  };

  return (
    <div
      className={`
        group relative rounded-lg border p-4 transition-all
        hover:border-primary/50 hover:bg-muted/50
        ${isActive
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border bg-card'
        }
        ${className ?? ''}
      `}
      data-testid={`version-item-${version.quizVersionId}`}
      data-active={isActive}
      onClick={handleContainerClick}
    >
      {/* Content */}
      <div className="flex items-start justify-between gap-3">
        {/* Left: version info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {/* Version number */}
            <span
              className={`
                inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                ${isDraft
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                }
              `}
              data-testid="version-number"
            >
              v{version.versionNumber}
            </span>

            {/* Status badge */}
            <span
              className={`
                inline-flex items-center rounded-full px-2 py-0.5 text-xs
                ${isDraft
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-500'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-500'
                }
              `}
              data-testid="version-status"
            >
              {isDraft ? 'Draft' : 'Published'}
            </span>
          </div>

          {/* Metadata */}
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span data-testid="question-count">
              {version.questions?.length ?? 0} questions
            </span>
            <span data-testid="version-date">
              {formatRelativeDate(isPublished && version.publishedAt ? version.publishedAt : version.createdAt)}
            </span>
          </div>
        </div>

        {/* Right: actions (for drafts) + active indicator */}
        <div className="flex items-center gap-2">
          {/* Actions menu (drafts only) */}
          {isDraft && onEdit && (
            <div
              className="relative z-10 opacity-0 transition-opacity group-hover:opacity-100"
              data-version-actions
              onClick={(e) => e.stopPropagation()}
            >
              <QuizVersionActionsMenu
                version={version}
                onEdit={onEdit}
                onAddQuestions={onAddQuestions ?? (() => {})}
                onPublish={onPublish ?? (() => {})}
                onDelete={onDelete ?? (() => {})}
                isReadyToPublish={isReadyToPublish}
                isDeleting={isDeleting}
              />
            </div>
          )}

          {/* Active indicator */}
          {isActive && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
              <svg
                className="h-3 w-3 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
