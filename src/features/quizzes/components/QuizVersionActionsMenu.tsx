/**
 * `QuizVersionActionsMenu` — dropdown menu with version actions.
 *
 * Source epic:   Epic 4.9 — Quiz version lifecycle + edit version metadata.
 * Source ticket: TKT-4.9.12.
 *
 * ## What this component renders
 *
 * - Three-dot menu icon
 * - Dropdown with actions: Edit, Add Questions, Publish, Delete
 * - Publish disabled state when not ready
 * - Confirm dialog for delete
 */

'use client';

import { memo, useCallback, useRef, useState } from 'react';

import { MoreHorizontal, Pencil, Plus, Rocket, Trash2, Eye } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { ConfirmDialog } from '@/components/primitives/ConfirmDialog/ConfirmDialog';

import type { QuizVersionSummary } from '@/features/quizzes/types/quiz-version.types';

export interface QuizVersionActionsMenuProps {
  /** The version to show actions for. */
  version: QuizVersionSummary;
  /** Called when user clicks "Edit metadata". */
  onEdit: () => void;
  /** Called when user clicks "Add questions". */
  onAddQuestions: () => void;
  /** Called when user clicks "Publish". */
  onPublish: () => void;
  /** Called when user confirms delete. */
  onDelete: () => void;
  /** `true` if the version has 5+ questions (ready to publish). */
  isReadyToPublish?: boolean;
  /** `true` while a delete is in progress. */
  isDeleting?: boolean;
  /** Optional extra className. */
  className?: string;
}

/**
 * `<QuizVersionActionsMenu />` — renders a dropdown menu with version actions.
 *
 * @example
 * ```tsx
 * <QuizVersionActionsMenu
 *   version={version}
 *   onEdit={() => editVersion()}
 *   onAddQuestions={() => router.push(`/my-quizzes/${quizId}/versions/${versionId}/questions`)}
 *   onPublish={() => publishVersion()}
 *   onDelete={() => deleteVersion()}
 *   isReadyToPublish={questionCount >= 5}
 * />
 * ```
 */
export const QuizVersionActionsMenu = memo(function QuizVersionActionsMenu({
  version,
  onEdit,
  onAddQuestions,
  onPublish,
  onDelete,
  isReadyToPublish = false,
  isDeleting = false,
  className,
}: QuizVersionActionsMenuProps): React.ReactElement {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isDraft = version.status === 'draft';
  const isPublished = version.status === 'published';
  const questionCount = version.questions?.length ?? 0;

  const handleDeleteConfirm = useCallback(async () => {
    onDelete();
    setShowDeleteConfirm(false);
  }, [onDelete]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            ref={triggerRef}
            className={`
              flex h-8 w-8 items-center justify-center rounded-md
              text-muted-foreground transition-colors
              hover:bg-muted hover:text-foreground
              ${className ?? ''}
            `}
            aria-label="Version actions"
            data-testid="version-actions-trigger"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-48"
          data-testid="version-actions-menu"
        >
          {/* Edit / View metadata */}
          {isDraft ? (
            <DropdownMenuItem
              onClick={onEdit}
              data-testid="action-edit"
            >
              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
              Edit metadata
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={onEdit}
              data-testid="action-view"
            >
              <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
              View metadata
            </DropdownMenuItem>
          )}

          {/* Add questions — drafts only */}
          {isDraft && (
            <DropdownMenuItem
              onClick={onAddQuestions}
              data-testid="action-add-questions"
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add questions
            </DropdownMenuItem>
          )}

          {/* Publish — drafts only, disabled if not ready */}
          {isDraft && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onPublish}
                disabled={!isReadyToPublish}
                className={!isReadyToPublish ? 'text-muted-foreground cursor-not-allowed' : ''}
                title={!isReadyToPublish ? `Need ${5 - questionCount} more question${5 - questionCount === 1 ? '' : 's'} to publish` : undefined}
                data-testid="action-publish"
              >
                <Rocket className="mr-2 h-4 w-4" aria-hidden="true" />
                Publish
                {!isReadyToPublish && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {questionCount}/{5}
                  </span>
                )}
              </DropdownMenuItem>
            </>
          )}

          {/* Delete — drafts only */}
          {isDraft && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteConfirm(true)}
                className="text-destructive focus:text-destructive"
                data-testid="action-delete"
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Delete version
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        kind="destructive-permanent"
        entityLabel={`version v${version.versionNumber}`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        loading={isDeleting}
      />
    </>
  );
});
