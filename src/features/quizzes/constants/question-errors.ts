/**
 * Question editor error messages for user-facing copy.
 *
 * These supplement the global `USER_COPY` table in `@/lib/api/error-codes.ts`.
 * Only codes specific to the question editor (Epic 4.10) are defined here.
 *
 * Codes already covered in `PHASE4_PRIORITY_COPY`:
 * - QUIZ_QUESTION_POSITION_CONFLICT (already defined)
 * - QUIZ_ANSWER_OPTION_POSITION_CONFLICT (already defined)
 * - QUIZ_MULTIPLE_CORRECT_OPTIONS (already defined)
 * - QUIZ_VALIDATION_FAILED (auto-derived)
 *
 * Additional codes specific to question editor:
 * - QUIZ_INSUFFICIENT_QUESTIONS (already defined)
 *
 * @see EPIC_4_10_TICKETS.md — T-4.10.3
 * @see `@/lib/api/error-codes.ts` — global USER_COPY table
 */

import { getUserCopy, type UserCopyEntry } from '@/lib/api/error-codes';
import type { ErrorCode } from '@/lib/api/error-codes';

// ─── Question editor-specific user copy ───────────────────────────────────

/**
 * User-facing copy entries specific to the question editor.
 * These override or supplement the auto-derived entries from USER_COPY.
 */
export const QUESTION_EDITOR_USER_COPY: Partial<Record<ErrorCode, UserCopyEntry>> = {
  /**
   * 422 validation failed on a single question submission.
   * Surface this when the backend returns field-level validation errors.
   */
  QUIZ_VALIDATION_FAILED: {
    title: 'Validation error',
    body: 'Please check your answers and try again.',
    toast: 'inline',
  },

  /**
   * 409 — question position conflict.
   * Already defined in PHASE4_PRIORITY_COPY but reinforced here for clarity.
   */
  QUIZ_QUESTION_POSITION_CONFLICT: {
    title: 'Position taken',
    body: 'A question already exists at this position. Choose a different position or renumber existing questions.',
    toast: 'inline',
  },

  /**
   * 409 — answer option position conflict.
   * Already defined in PHASE4_PRIORITY_COPY but reinforced here for clarity.
   */
  QUIZ_ANSWER_OPTION_POSITION_CONFLICT: {
    title: 'Option position taken',
    body: 'An answer option already exists at this position. Choose a different position.',
    toast: 'inline',
  },

  /**
   * 409 — multiple correct options on a type that only allows one.
   * Already defined in PHASE4_PRIORITY_COPY but reinforced here for clarity.
   */
  QUIZ_MULTIPLE_CORRECT_OPTIONS: {
    title: 'Too many correct answers',
    body: 'This question type only allows one correct answer. Please uncheck the extra answers.',
    toast: 'inline',
  },
};

// ─── 429 rate limit helper ───────────────────────────────────────────────

/**
 * Get the user-friendly message for a 429 rate limit error.
 *
 * @param seconds - Seconds remaining in the cooldown
 * @returns User copy entry with the countdown filled in
 */
export function getRateLimitCopy(seconds: number): UserCopyEntry {
  return {
    title: 'Too many requests',
    body: `Please wait ${seconds} second${seconds === 1 ? '' : 's'} before trying again.`,
    toast: 'inline',
  };
}

// ─── Per-field error helper ───────────────────────────────────────────────

/**
 * Field-level validation error messages for the question editor.
 * These are used for inline field errors in the single/bulk forms.
 */
export const FIELD_ERROR_MESSAGES = {
  questionText: {
    required: 'Question text is required',
    minLength: 'Question text must be at least 1 character',
    maxLength: 'Question text cannot exceed 1000 characters',
  },
  questionType: {
    required: 'Please select a question type',
    invalid: 'Invalid question type',
  },
  answerOptions: {
    required: 'At least 2 answer options are required',
    minLength: 'At least 2 answer options are required',
    maxLength: 'No more than 6 answer options are allowed',
    noCorrect: 'Please mark the correct answer(s)',
    tooManyCorrect: 'Only one answer can be correct for this question type',
  },
  imageUrl: {
    invalid: 'Please enter a valid image URL',
    tooLarge: 'Image URL exceeds maximum length',
  },
  position: {
    required: 'Position is required',
    min: 'Position must be at least 1',
  },
} as const;

// ─── Helper function ──────────────────────────────────────────────────────

/**
 * Get user copy for a question editor error code.
 * Falls back to the global USER_COPY table if not defined here.
 *
 * @param code - Error code
 * @returns User copy entry
 *
 * @example
 * ```typescript
 * const { title, body } = getQuestionEditorCopy('QUIZ_VALIDATION_FAILED');
 * ```
 */
export function getQuestionEditorCopy(code: string): UserCopyEntry {
  if (code in QUESTION_EDITOR_USER_COPY) {
    return QUESTION_EDITOR_USER_COPY[code as keyof typeof QUESTION_EDITOR_USER_COPY]!;
  }
  return getUserCopy(code);
}
