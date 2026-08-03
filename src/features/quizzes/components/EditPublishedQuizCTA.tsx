/**
 * `EditPublishedQuizCTA` — CTA to create a new draft from a published version.
 *
 * Source epic:   Epic 4.11 — Quiz publish flow + edit-published-as-new-draft.
 * Source ticket: T-4.11.14.
 *
 * ## What this component renders
 *
 * A prominent call-to-action that allows authors to create a new draft version
 * from an existing published version. This replaces the in-place editing of
 * published versions (published versions are immutable).
 *
 * ## When this CTA is shown
 *
 * - Only for `status === 'published'` versions
 * - Only for the quiz owner (via `isOwner` prop)
 * - Not shown for draft versions (those can be edited directly)
 *
 * ## Usage
 *
 * ```tsx
 * {version.status === 'published' && isOwner && (
 *   <EditPublishedQuizCTA
 *     quizId={quizId}
 *     version={version}
 *     onDraftCreated={(newVersion) => router.push(`/my-quizzes/${quizId}/edit?versionId=${newVersion.quizVersionId}`)}
 *   />
 * )}
 * ```
 */

'use client';

import { memo, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Copy, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';

import { useCreateVersion } from '@/features/quizzes/hooks';
import type { QuizVersionSummary } from '@/features/quizzes/types/quiz-version.types';

/**
 * Props for the `<EditPublishedQuizCTA />` component.
 */
export interface EditPublishedQuizCTAProps {
  /** Quiz UUID. */
  quizId: string;
  /** The published version to create a draft from. */
  version: QuizVersionSummary;
  /** Called after the draft version is created successfully. */
  onDraftCreated: (version: QuizVersionSummary) => void;
  /** Called when draft creation fails. */
  onError?: (error: unknown) => void;
  /** Optional extra className. */
  className?: string;
}

/**
 * CTA for creating a new draft version from a published version.
 *
 * Shows a prominent card with:
 * - Title explaining that published versions cannot be edited
 * - "Create new draft version" button
 * - Loading state during draft creation
 */
export const EditPublishedQuizCTA = memo(function EditPublishedQuizCTA({
  quizId,
  version,
  onDraftCreated,
  onError,
  className,
}: EditPublishedQuizCTAProps) {
  const router = useRouter();
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);

  const { createVersion } = useCreateVersion({
    onSuccess: (newVersion) => {
      setIsCreatingDraft(false);
      onDraftCreated(newVersion);
    },
    onError: (error) => {
      setIsCreatingDraft(false);
      onError?.(error);
    },
  });

  const handleCreateDraft = useCallback(async () => {
    setIsCreatingDraft(true);
    try {
      await createVersion(quizId, {
        // Copy questions from the published version
        sourceVersionId: version.quizVersionId,
        difficulty: version.difficulty,
        durationMs: version.durationMs,
        passingScorePercent: version.passingScorePercent,
        rewardXp: version.rewardXp,
      });
    } catch (error) {
      setIsCreatingDraft(false);
      onError?.(error);
    }
  }, [quizId, version, createVersion, onError]);

  return (
    <div
      className={`
        rounded-lg border border-amber-200 bg-amber-50 p-6
        dark:border-amber-800 dark:bg-amber-950
        ${className ?? ''}
      `}
      data-testid="edit-published-quiz-cta"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: explanation */}
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-base font-medium text-amber-900 dark:text-amber-100">
            <Copy className="h-5 w-5" aria-hidden="true" />
            This version has been published
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Published quiz versions cannot be edited in-place. To make changes,
            create a new draft version — your questions will be copied over.
          </p>
          {version.questions && version.questions.length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {version.questions.length} question{version.questions.length === 1 ? '' : 's'} will be copied to the new draft.
            </p>
          )}
        </div>

        {/* Right: action */}
        <div className="shrink-0">
          <Button
            variant="default"
            size="default"
            onClick={handleCreateDraft}
            disabled={isCreatingDraft}
            className="whitespace-nowrap"
            data-testid="create-draft-btn"
          >
            {isCreatingDraft ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Creating draft…
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" />
                Create new draft version
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
});
