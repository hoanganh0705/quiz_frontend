/**
 * `QuestionCorrectMark` — correct answer indicator/marker for author view.
 *
 * Source epic:   Epic 4.10 — Question editor (single + bulk).
 * Source ticket: T-4.10.15.
 *
 * ## What this component owns
 *
 * - **Correct marking** — checkbox or radio based on question type.
 * - **Visual feedback** — green indicator when marked correct.
 * - **Accessibility** — proper ARIA labels and keyboard support.
 *
 * ## CRITICAL: Author-only component
 *
 * This component must NEVER be used in player-facing components.
 * It exposes the `isCorrect` field which should not be visible to players.
 *
 * ## Usage
 *
 * - `single_choice` / `true_false` → Radio (only 1 correct allowed)
 * - `multiple_choice` → Checkbox (multiple correct allowed)
 * - `short_answer` → Not rendered (no answer options)
 *
 * @see `QuestionType` — question type enum
 */

'use client';

import { memo } from 'react';
import { Check } from 'lucide-react';

import { cn } from '@/shared/utils/merge-class-names';

import type { QuestionType } from '@/features/quizzes/types/author-dtos';

// ─── Props ─────────────────────────────────────────────────────────────────

export interface QuestionCorrectMarkProps {
  /** Whether this option is marked as correct. */
  isCorrect: boolean;
  /** Question type determines input type. */
  questionType: QuestionType;
  /** Callback when correct state changes. */
  onChange: (isCorrect: boolean) => void;
  /** Whether the control is disabled. */
  disabled?: boolean;
  /** Input name for radio groups. */
  name?: string;
  /** Unique ID for this option. */
  id: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * `<QuestionCorrectMark />` — marks an answer option as correct.
 *
 * Renders as:
 * - Radio button for single_choice and true_false (only 1 correct allowed)
 * - Checkbox for multiple_choice (multiple correct allowed)
 */
export const QuestionCorrectMark = memo(function QuestionCorrectMark({
  isCorrect,
  questionType,
  onChange,
  disabled,
  name,
  id,
}: QuestionCorrectMarkProps): React.ReactElement {
  const isRadio = questionType === 'single_choice' || questionType === 'true_false';

  return (
    <div className="relative flex items-center">
      {isRadio ? (
        <button
          type="button"
          role="radio"
          aria-checked={isCorrect}
          aria-label="Mark as correct answer"
          disabled={disabled}
          name={name}
          data-testid={`correct-mark-radio-${id}`}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
            'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            isCorrect
              ? 'border-green-500 bg-green-500 text-white'
              : 'border-muted-foreground/30 bg-card hover:border-green-400',
            disabled && 'cursor-not-allowed opacity-50',
          )}
          onClick={() => !disabled && onChange(!isCorrect)}
        >
          {isCorrect && <Check className="h-4 w-4" />}
        </button>
      ) : (
        <button
          type="button"
          role="checkbox"
          aria-checked={isCorrect}
          aria-label="Mark as correct answer"
          disabled={disabled}
          data-testid={`correct-mark-checkbox-${id}`}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md border-2 transition-all',
            'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            isCorrect
              ? 'border-green-500 bg-green-500 text-white'
              : 'border-muted-foreground/30 bg-card hover:border-green-400',
            disabled && 'cursor-not-allowed opacity-50',
          )}
          onClick={() => !disabled && onChange(!isCorrect)}
        >
          {isCorrect && <Check className="h-4 w-4" />}
        </button>
      )}

      {/* Tooltip on hover */}
      {isCorrect ? (
        <span className="sr-only">Correct answer</span>
      ) : (
        <span className="sr-only">Incorrect answer</span>
      )}
    </div>
  );
});
