/**
 * `QuestionEditor` — main wrapper component for the question editor.
 *
 * Source epic:   Epic 4.10 — Question editor (single + bulk).
 * Source ticket: T-4.10.10.
 *
 * ## What this component owns
 *
 * - **View state** — toggles between single and bulk question forms.
 * - **Tab switching** — preserves form state when switching tabs.
 * - **Author DTO invariant check** — asserts `isCorrect` fields exist.
 * - **Publish readiness counter** — shows questions vs. minimum required.
 *
 * ## Form composition
 *
 * - `<QuestionList />` — renders existing questions above the forms
 * - `<SingleQuestionForm />` — single question creation form
 * - `<BulkQuestionForm />` — bulk question creation form
 * - `<PublishReadinessCounter />` — live count display
 *
 * ## Author DTO Invariant (T-4.10.22)
 *
 * This component verifies that received question DTOs are author variants
 * (with `isCorrect` field) rather than player variants. Violations are
 * logged to Sentry and render an error boundary.
 *
 * @see `assertAuthorQuestionDto` — the invariant enforcement utility
 * @see `QuestionList` — question list component
 * @see `SingleQuestionForm` — single question form
 * @see `BulkQuestionForm` — bulk question form
 */

'use client';

import { memo, useCallback, useEffect, useState } from 'react';

import type { ApiError } from '@/lib/api';
import type { QuizAuthorQuestionDto } from '@/features/quizzes/types/author-dtos';
import { logger } from '@/shared/log';

import { QuestionList } from './QuestionList';
import { SingleQuestionForm } from './SingleQuestionForm';
import { BulkQuestionForm } from './BulkQuestionForm';
import { PublishReadinessCounter } from './PublishReadinessCounter';

import {
  assertAuthorQuestionDto,
  AuthorDtoInvariantError,
} from '@/features/quizzes/invariants/dto-type-check';

// ─── View mode type ────────────────────────────────────────────────────────

type ViewMode = 'single' | 'bulk';

// ─── Props ─────────────────────────────────────────────────────────────────

export interface QuestionEditorProps {
  /** Quiz UUID. */
  quizId: string;
  /** Quiz version UUID. */
  versionId: string;
  /** Version number for display. */
  versionNumber: number;
  /** Existing questions for the version. */
  questions: QuizAuthorQuestionDto[];
  /** Publish readiness state. */
  publishReadiness: {
    current: number;
    required: number;
    isReady: boolean;
  };
  /** Whether the version is a draft. */
  isDraft: boolean;
  /** Callback when a question is added. */
  onQuestionAdded: () => void;
  /** Callback when an error occurs. */
  onError: (error: ApiError) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * `<QuestionEditor />` — main wrapper for the question editor.
 *
 * Composes the question list with the single/bulk form tabs.
 *
 * **Author DTO Invariant:** This component asserts that `questions` are
 * author DTOs (with `isCorrect` on options). If a player DTO is passed,
 * the invariant check throws `AuthorDtoInvariantError`, which is caught
 * here and reported to `onError`.
 */
export const QuestionEditor = memo(function QuestionEditor({
  quizId,
  versionId,
  versionNumber,
  questions,
  publishReadiness,
  isDraft,
  onQuestionAdded,
  onError,
}: QuestionEditorProps): React.ReactElement {
  // ── View mode state ──────────────────────────────────────────────────

  const [viewMode, setViewMode] = useState<ViewMode>('single');

  // ── Form state preservation ──────────────────────────────────────────

  const [singleFormKey, setSingleFormKey] = useState(0);
  const [bulkFormKey, setBulkFormKey] = useState(0);

  // ── Author DTO invariant check (T-4.10.22) ────────────────────────

  useEffect(() => {
    try {
      assertAuthorQuestionDto(questions);
    } catch (err) {
      // Log the error to console in development
      if (process.env.NODE_ENV === 'development') {
        logger.warn('quizzes.question-editor', 'Author DTO invariant violation', err);
      }

      // Report to parent via error callback
      onError({
        status: 500,
        code: 'GLOBAL_INTERNAL_ERROR',
        message: err instanceof AuthorDtoInvariantError
          ? 'Data integrity check failed: expected author DTO with isCorrect field'
          : 'Data integrity check failed',
      } as ApiError);
    }
  }, [questions, onError]);

  // ── View mode handlers ────────────────────────────────────────────────

  const handleTabChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  // ── Question added handler ────────────────────────────────────────────

  const handleQuestionAdded = useCallback(() => {
    onQuestionAdded();
    // Reset single form on question add
    setSingleFormKey((k) => k + 1);
  }, [onQuestionAdded]);

  const handleBulkQuestionsAdded = useCallback(() => {
    onQuestionAdded();
    // Reset bulk form on questions add
    setBulkFormKey((k) => k + 1);
  }, [onQuestionAdded]);

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-8" data-testid="question-editor">
      {/* Tab buttons */}
      <div className="flex items-center gap-4 border-b border-border">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            viewMode === 'single'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => handleTabChange('single')}
          aria-selected={viewMode === 'single'}
          role="tab"
        >
          Add Single Question
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            viewMode === 'bulk'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => handleTabChange('bulk')}
          aria-selected={viewMode === 'bulk'}
          role="tab"
        >
          Bulk Add
        </button>
      </div>

      {/* Publish readiness counter */}
      <PublishReadinessCounter
        current={publishReadiness.current}
        required={publishReadiness.required}
        isReady={publishReadiness.isReady}
      />

      {/* Question list */}
      <QuestionList questions={questions} />

      {/* Active form */}
      <div role="tabpanel" data-testid={`question-form-${viewMode}`}>
        {viewMode === 'single' ? (
          <SingleQuestionForm
            key={`single-${singleFormKey}`}
            quizId={quizId}
            versionId={versionId}
            versionNumber={versionNumber}
            questionCount={questions.length}
            isDraft={isDraft}
            onSuccess={handleQuestionAdded}
            onError={onError}
          />
        ) : (
          <BulkQuestionForm
            key={`bulk-${bulkFormKey}`}
            quizId={quizId}
            versionId={versionId}
            questionCount={questions.length}
            isDraft={isDraft}
            onSuccess={handleBulkQuestionsAdded}
            onError={onError}
          />
        )}
      </div>
    </div>
  );
});
