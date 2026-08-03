/**
 * `QuestionListItem` — individual question row in the list.
 *
 * Source epic:   Epic 4.10 — Question editor (single + bulk).
 * Source ticket: T-4.10.12.
 *
 * ## What this component owns
 *
 * - **Question display** — question type badge, text preview, correct count.
 * - **Image thumbnail** — optional image preview (50x50).
 * - **Action affordances** — edit (future), delete (with confirmation or disabled).
 * - **Drag handle** — shown for reordering (future; disabled if no PATCH endpoint).
 *
 * ## Question type badges
 *
 * | Type | Label | Icon |
 * |------|-------|------|
 * | single_choice | Single choice | Circle |
 * | multiple_choice | Multiple choice | CheckSquare |
 * | true_false | True/False | ToggleLeft |
 * | short_answer | Short answer | AlignLeft |
 *
 * @see `QuestionType` — question type enum
 */

'use client';

import { memo } from 'react';
import {
  Circle,
  CheckSquare,
  ToggleLeft,
  AlignLeft,
  Trash2,
  GripVertical,
} from 'lucide-react';

import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';

import type { QuizAuthorQuestionDto, QuestionType } from '@/features/quizzes/types/author-dtos';

// ─── Type badge config ────────────────────────────────────────────────────────

const QUESTION_TYPE_CONFIG: Record<
  QuestionType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  single_choice: { label: 'Single choice', icon: Circle },
  multiple_choice: { label: 'Multiple choice', icon: CheckSquare },
  true_false: { label: 'True/False', icon: ToggleLeft },
  short_answer: { label: 'Short answer', icon: AlignLeft },
};

// ─── Helper functions ───────────────────────────────────────────────────────

/**
 * Get the question type config, defaulting to single_choice if unknown.
 */
function getQuestionTypeConfig(
  type: string,
): { label: string; icon: React.ComponentType<{ className?: string }> } {
  return QUESTION_TYPE_CONFIG[type as QuestionType] ?? QUESTION_TYPE_CONFIG.single_choice;
}

/**
 * Truncate text to a maximum length with ellipsis.
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

/**
 * Count the number of correct answers.
 */
function countCorrectAnswers(question: QuizAuthorQuestionDto): number {
  return question.answerOptions.filter((opt) => opt.isCorrect).length;
}

// ─── Props ─────────────────────────────────────────────────────────────────

export interface QuestionListItemProps {
  /** The question to display. */
  question: QuizAuthorQuestionDto;
  /** Callback when edit is clicked. */
  onEdit?: (questionId: string) => void;
  /** Callback when delete is clicked. */
  onDelete?: (questionId: string) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * `<QuestionListItem />` — renders a single question row.
 */
export const QuestionListItem = memo(function QuestionListItem({
  question,
  onEdit,
  onDelete,
}: QuestionListItemProps): React.ReactElement {
  const typeConfig = getQuestionTypeConfig(
    (question as unknown as { questionType?: string }).questionType ?? 'single_choice',
  );
  const TypeIcon = typeConfig.icon;
  const correctCount = countCorrectAnswers(question);
  const truncatedText = truncateText(question.questionText, 100);

  return (
    <div
      className="flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
      data-testid={`question-item-${question.questionId}`}
    >
      {/* Drag handle (future use) */}
      <div className="flex h-8 cursor-not-allowed items-center justify-center rounded text-muted-foreground/50">
        <GripVertical className="h-5 w-5" />
      </div>

      {/* Question type badge */}
      <div className="flex h-8 items-center gap-2 rounded-full bg-secondary px-3">
        <TypeIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium">{typeConfig.label}</span>
      </div>

      {/* Question text */}
      <div className="min-w-0 flex-1">
        <p className="text-sm" title={question.questionText}>
          {truncatedText}
        </p>

        {/* Correct answer count */}
        <p className="mt-1 text-xs text-muted-foreground">
          {correctCount === 1
            ? '1 correct answer'
            : `${correctCount} correct answers`}
        </p>
      </div>

      {/* Image thumbnail */}
      {question.imageUrl && (
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={question.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Position badge */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
        {question.position}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Edit button (future) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              disabled
              aria-label="Edit question (coming soon)"
            >
              <span className="sr-only">Edit</span>
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit (coming soon)</TooltipContent>
        </Tooltip>

        {/* Delete button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              disabled
              aria-label="Delete question"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete (not yet available)</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
});

// ─── Skeleton ───────────────────────────────────────────────────────────────

/**
 * Skeleton for `QuestionListItem`.
 */
export function QuestionListItemSkeleton(): React.ReactElement {
  return (
    <div
      className="flex items-start gap-3 rounded-lg border bg-card p-4"
      data-testid="question-item-skeleton"
    >
      <Skeleton className="h-8 w-8 rounded" />
      <Skeleton className="h-8 w-32 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-8 w-8 rounded" />
    </div>
  );
}
