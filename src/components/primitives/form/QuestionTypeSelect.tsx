'use client';

/**
 * `<QuestionTypeSelect />` — five-option enum select for quiz question
 * types.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source story:  PHASE_4_EPICS.md → Story 4.2 (lines 202–293).
 * Source ticket: TKT-4.2.B5.
 *
 * ## What this atom owns
 *
 *   - **`<Select>` composition** with `useController` registration.
 *   - **Five-option enum** matching the master-plan line 207 enum:
 *
 *       1. `single_choice` (the documented default)
 *       2. `multiple_choice`
 *       3. `true_false`
 *       4. `short_answer`
 *       5. `fill_in_the_blank`
 *
 *     The values are surfaced as a constant so the `<Select>` items
 *     stay in lockstep with the read-side question-editor renderer
 *     (TKT-4.10).
 *   - **Out-of-range fallback** — on any value that is not a member of
 *     the documented enum, the atom writes `single_choice` back to the
 *     form on mount and surfaces the documented banner.
 *   - **Zod-error surfacing** — when `formState.errors[name]` is
 *     non-empty, the atom renders the message below the trigger.
 *
 * ## Open question
 *
 * The generated SDK does NOT yet expose a `QuizQuestionType` enum DTO
 * (the backend controller exists, but the OpenAPI spec does not list
 * the enum). Once the backend exposes the enum, the const list below
 * is replaced by an import from `@/lib/api/generated/schemas/…`. The
 * ticket deliberately localises this drift so the swap is a single
 * diff.
 *
 * ## Type-system contract
 *
 * Same as the rest of the form-atom family.
 */

import * as React from 'react';
import {
  useController,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import type { z } from 'zod';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { cn } from '@/shared/utils/merge-class-names';

export interface QuestionTypeSelectProps<
  T extends z.ZodType<FieldValues, any, any>
> {
  name: Path<z.infer<T>>;
  label: string;
  description?: string;
  /** Force-disable regardless of the form's submitting state. */
  disabled?: boolean;
  /** Optional className appended to the wrapping `<div>`. */
  className?: string;
}

/** Documented question types in the order rendered by the `<Select>`. */
export const QUESTION_TYPE_VALUES = [
  'single_choice',
  'multiple_choice',
  'true_false',
  'short_answer',
  'fill_in_the_blank',
] as const;

export type QuestionType = (typeof QUESTION_TYPE_VALUES)[number];

/** Documented fallback for out-of-range incoming defaults. */
const QUESTION_TYPE_FALLBACK: QuestionType = 'single_choice';

/** Copy shown when the atom resets the form to the fallback value. */
const QUESTION_TYPE_INVALID_COPY = `Question type reset to ${QUESTION_TYPE_FALLBACK} — invalid value.`;

/** Human-readable label per question type. */
const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  single_choice: 'Single choice',
  multiple_choice: 'Multiple choice',
  true_false: 'True / False',
  short_answer: 'Short answer',
  fill_in_the_blank: 'Fill in the blank',
};

function isValidQuestionType(value: unknown): value is QuestionType {
  return (
    typeof value === 'string' &&
    (QUESTION_TYPE_VALUES as readonly string[]).includes(value)
  );
}

/**
 * `<QuestionTypeSelect />` — five-option question-type enum select
 * that falls through to `single_choice` on out-of-range defaults.
 */
export function QuestionTypeSelect<
  T extends z.ZodType<FieldValues, any, any>
>(props: QuestionTypeSelectProps<T>): React.ReactElement {
  const { name, label, description, disabled, className } = props;

  const { field, fieldState, formState } = useController({ name });
  const [showFallbackBanner, setShowFallbackBanner] = React.useState(false);

  // First-render out-of-range check. The ref ensures the check runs
  // exactly once per mount, not on every render.
  const initialCheckRanRef = React.useRef(false);
  React.useEffect(() => {
    if (initialCheckRanRef.current) return;
    initialCheckRanRef.current = true;
    if (!isValidQuestionType(field.value)) {
      field.onChange(QUESTION_TYPE_FALLBACK);
      setShowFallbackBanner(true);
    }
  }, [field]);

  const selectDisabled =
    disabled === true ? true : disabled === false ? false : formState.isSubmitting;

  const errorMessage = fieldState.error?.message;
  const inputId = React.useId();

  return (
    <div className={cn('space-y-2', className)} data-testid={`question-type-select-${name}`}>
      <Label htmlFor={inputId}>{label}</Label>
      {description ? (
        <p className='text-xs text-muted-foreground'>{description}</p>
      ) : null}
      <Select
        value={isValidQuestionType(field.value) ? field.value : QUESTION_TYPE_FALLBACK}
        onValueChange={(next) => {
          if (typeof next === 'string') {
            field.onChange(next);
          }
        }}
        disabled={selectDisabled}
        name={field.name}
      >
        <SelectTrigger id={inputId} data-testid={`question-type-select-trigger-${name}`}>
          <SelectValue placeholder='Select question type' />
        </SelectTrigger>
        <SelectContent>
          {QUESTION_TYPE_VALUES.map((option) => (
            <SelectItem key={option} value={option}>
              {QUESTION_TYPE_LABEL[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showFallbackBanner ? (
        <p
          className='text-xs text-warning'
          role='status'
          aria-live='polite'
          data-testid={`question-type-select-fallback-banner-${name}`}
        >
          {QUESTION_TYPE_INVALID_COPY}
        </p>
      ) : null}
      {errorMessage ? (
        <p className='text-xs text-destructive' role='alert'>
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}