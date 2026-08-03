/**
 * `useQuestionForm` — thin adapter around `useQuizForm` for question-type forms.
 *
 * Source epic:   Epic 4.10 — Question editor (single + bulk).
 * Source ticket: T-4.10.8.
 *
 * ## What this hook owns
 *
 * - Adapts `useQuizForm` for the question editor's specific form needs.
 * - Provides field names matching the question creation schema.
 * - Supports both single and bulk submission modes.
 *
 * ## Form fields
 *
 * - `questionText` — question text (1–1000 chars)
 * - `imageUrl` — optional image URL
 * - `questionType` — enum (single_choice | multiple_choice | true_false | short_answer)
 * - `answerOptions` — array of answer options with position, value, isCorrect
 *
 * ## Usage with useQuizForm
 *
 * This hook is a thin wrapper that configures `useQuizForm` with the appropriate
 * schema and field mappings. It does NOT replace `useQuizForm`; rather, it provides
 * a pre-configured version for the question editor.
 *
 * @see `useQuizForm` — the underlying form primitive
 * @see `createQuestionSchema` — the validation schema
 * @see `CreateQuestionFormValues` — the form values type
 */

'use client';

import { useCallback } from 'react';

import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';

import {
  useQuizForm,
  type UseQuizFormOptions,
  type UseQuizFormReturn,
  type BulkError,
} from '@/lib/forms/useQuizForm';
import type { ApiError } from '@/lib/api';

import {
  createQuestionSchema,
  bulkQuestionsSchema,
  type CreateQuestionFormValues,
  type BulkQuestionRow,
} from '@/features/quizzes/validation/question-schemas';
import {
  QUESTION_TYPE_VALUES,
  type QuestionType,
} from '@/features/quizzes/types/author-dtos';

// ─── Default form values ─────────────────────────────────────────────────

/**
 * Generate default answer options for a question type.
 */
function getDefaultOptions(questionType: QuestionType): Array<{
  id: string;
  position: number;
  value: string;
  isCorrect: boolean;
}> {
  switch (questionType) {
    case 'true_false':
      return [
        { id: crypto.randomUUID(), position: 1, value: 'True', isCorrect: false },
        { id: crypto.randomUUID(), position: 2, value: 'False', isCorrect: false },
      ];
    case 'single_choice':
    case 'multiple_choice':
    default:
      return [
        { id: crypto.randomUUID(), position: 1, value: '', isCorrect: false },
        { id: crypto.randomUUID(), position: 2, value: '', isCorrect: false },
      ];
    case 'short_answer':
      return []; // Short answer has no options
  }
}

/**
 * Default form values for a new question.
 */
export function getDefaultQuestionValues(
  questionType: QuestionType = 'single_choice',
  position: number = 1,
): CreateQuestionFormValues {
  return {
    questionText: '',
    imageUrl: undefined,
    questionType,
    answerOptions: getDefaultOptions(questionType),
  };
}

// ─── Form options type ───────────────────────────────────────────────────

export interface UseQuestionFormOptions
  extends Pick<
    UseQuizFormOptions<typeof createQuestionSchema>,
    'submit' | 'bulkHandler' | 'mode'
  > {
  /** Initial question type. Defaults to 'single_choice'. */
  initialQuestionType?: QuestionType;
  /** Initial position. Defaults to 1. */
  initialPosition?: number;
}

// ─── Hook return type ────────────────────────────────────────────────────

export interface UseQuestionFormReturn
  extends Omit<UseQuizFormReturn<typeof createQuestionSchema>, 'bulkError'> {
  /**
   * Bulk error array from `bulkSubmit`.
   * Each entry contains the index, field, and error message.
   */
  bulkError: BulkError[];
  /**
   * Add a new answer option.
   */
  addOption: () => void;
  /**
   * Remove an answer option by index.
   */
  removeOption: (index: number) => void;
  /**
   * Update an answer option's value.
   */
  updateOption: (index: number, updates: Partial<{
    value: string;
    isCorrect: boolean;
  }>) => void;
  /**
   * Reorder answer options (for drag-and-drop).
   */
  reorderOptions: (fromIndex: number, toIndex: number) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Question form hook — thin adapter around `useQuizForm`.
 *
 * Provides a pre-configured form for the question editor with:
 * - Single question creation (submit)
 * - Bulk question creation (bulkSubmit)
 * - Answer option management helpers
 *
 * @example
 * ```tsx
 * const {
 *   form,
 *   errors,
 *   isSubmitting,
 *   submit,
 *   reset,
 *   addOption,
 *   removeOption,
 *   updateOption,
 * } = useQuestionForm({
 *   initialQuestionType: 'single_choice',
 *   submit: async (values) => {
 *     const result = await createVersionQuestion(quizId, versionId, {
 *       ...values,
 *       position: nextPosition,
 *     });
 *     return result;
 *   },
 * });
 *
 * return (
 *   <form onSubmit={form.handleSubmit(submit)}>
 *     <TextField {...form.register('questionText')} />
 *     <QuestionTypeSelect name="questionType" />
 *     <AnswerOptionsEditor
 *       options={form.watch('answerOptions')}
 *       onAdd={addOption}
 *       onRemove={removeOption}
 *       onUpdate={updateOption}
 *     />
 *     <Button type="submit" disabled={isSubmitting}>
 *       {isSubmitting ? 'Adding...' : 'Add Question'}
 *     </Button>
 *   </form>
 * );
 * ```
 */
export function useQuestionForm(
  options: UseQuestionFormOptions = {},
): UseQuestionFormReturn {
  const {
    initialQuestionType = 'single_choice',
    initialPosition = 1,
    submit,
    bulkHandler,
    mode = 'single',
  } = options;

  // Build the useQuizForm options
  const quizFormOptions: UseQuizFormOptions<typeof createQuestionSchema> = {
    schema: createQuestionSchema,
    defaultValues: getDefaultQuestionValues(initialQuestionType, initialPosition),
    mode,
    submit: submit as UseQuizFormOptions<typeof createQuestionSchema>['submit'],
    bulkHandler: bulkHandler as UseQuizFormOptions<typeof createQuestionSchema>['bulkHandler'],
  };

  // Call the underlying useQuizForm
  const quizFormReturn = useQuizForm(quizFormOptions);

  // Extract form methods
  const { form, setValue, watch } = quizFormReturn;

  // ── Option management helpers ──────────────────────────────────────────

  /**
   * Add a new answer option.
   */
  const addOption = useCallback(() => {
    const currentOptions = watch('answerOptions') ?? [];
    const newPosition = currentOptions.length + 1;

    setValue('answerOptions', [
      ...currentOptions,
      {
        id: crypto.randomUUID(),
        position: newPosition,
        value: '',
        isCorrect: false,
      },
    ], { shouldValidate: false });
  }, [setValue, watch]);

  /**
   * Remove an answer option by index.
   */
  const removeOption = useCallback(
    (index: number) => {
      const currentOptions = watch('answerOptions') ?? [];
      if (currentOptions.length <= 2) {
        // Minimum 2 options enforced by schema
        return;
      }

      const newOptions = currentOptions.filter((_, i) => i !== index);
      // Re-index positions
      const reindexed = newOptions.map((opt, i) => ({
        ...opt,
        position: i + 1,
      }));

      setValue('answerOptions', reindexed, { shouldValidate: false });
    },
    [setValue, watch],
  );

  /**
   * Update an answer option's value.
   */
  const updateOption = useCallback(
    (index: number, updates: Partial<{ value: string; isCorrect: boolean }>) => {
      const currentOptions = watch('answerOptions') ?? [];
      const newOptions = [...currentOptions];

      if (index >= 0 && index < newOptions.length) {
        newOptions[index] = { ...newOptions[index]!, ...updates };
        setValue('answerOptions', newOptions, { shouldValidate: false });
      }
    },
    [setValue, watch],
  );

  /**
   * Reorder answer options (for drag-and-drop).
   */
  const reorderOptions = useCallback(
    (fromIndex: number, toIndex: number) => {
      const currentOptions = watch('answerOptions') ?? [];
      const newOptions = [...currentOptions];

      if (
        fromIndex < 0 ||
        fromIndex >= newOptions.length ||
        toIndex < 0 ||
        toIndex >= newOptions.length
      ) {
        return;
      }

      const [moved] = newOptions.splice(fromIndex, 1);
      newOptions.splice(toIndex, 0, moved);

      // Re-index positions
      const reindexed = newOptions.map((opt, i) => ({
        ...opt,
        position: i + 1,
      }));

      setValue('answerOptions', reindexed, { shouldValidate: false });
    },
    [setValue, watch],
  );

  return {
    ...quizFormReturn,
    addOption,
    removeOption,
    updateOption,
    reorderOptions,
  };
}

// ─── Bulk form type ──────────────────────────────────────────────────────

/**
 * Options for the bulk question form.
 */
export interface UseBulkQuestionFormOptions {
  /** Callback when bulk submission completes. */
  onSuccess?: (questions: BulkQuestionRow[]) => void;
  /** Callback when submission fails. */
  onError?: (error: ApiError) => void;
  /** Rows to submit. */
  rows?: BulkQuestionRow[];
}

// ─── Constants for answer options ─────────────────────────────────────────

export const ANSWER_OPTIONS_LIMITS = {
  MIN: 2,
  MAX: 6,
} as const;
