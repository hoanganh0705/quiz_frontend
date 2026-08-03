/**
 * Zod validation schemas for the Question Editor (Epic 4.10).
 *
 * These schemas mirror the backend validation rules defined in the epic spec.
 * They are used for client-side form validation via `useQuizForm`.
 *
 * @see EPIC_4_10_TICKETS.md — T-4.10.2
 */

import { z } from 'zod';

import {
  QUESTION_TYPE_VALUES,
  QUESTION_VALIDATION,
} from '@/features/quizzes/types/author-dtos';

// ─── Primitive schemas ────────────────────────────────────────────────────

/**
 * Valid question type enum.
 */
export const questionTypeSchema = z.enum(QUESTION_TYPE_VALUES);

/**
 * Question text: 1–1000 characters.
 */
export const questionTextSchema = z
  .string()
  .min(
    QUESTION_VALIDATION.TEXT_MIN,
    `Question text must be at least ${QUESTION_VALIDATION.TEXT_MIN} character`,
  )
  .max(
    QUESTION_VALIDATION.TEXT_MAX,
    `Question text cannot exceed ${QUESTION_VALIDATION.TEXT_MAX} characters`,
  );

/**
 * Optional image URL: valid URL or null/undefined.
 */
export const questionImageSchema = z
  .union([z.string().url().max(2048), z.null(), z.undefined()])
  .optional();

/**
 * Answer option text: 1–200 characters.
 */
export const answerOptionTextSchema = z
  .string()
  .min(
    QUESTION_VALIDATION.OPTION_TEXT_MIN,
    `Option text must be at least ${QUESTION_VALIDATION.OPTION_TEXT_MIN} character`,
  )
  .max(
    QUESTION_VALIDATION.OPTION_TEXT_MAX,
    `Option text cannot exceed ${QUESTION_VALIDATION.OPTION_TEXT_MAX} characters`,
  );

/**
 * Answer option position: 1-based integer.
 */
export const answerOptionPositionSchema = z
  .number()
  .int()
  .min(1, 'Position must be at least 1');

/**
 * Question position: 1-based integer.
 */
export const questionPositionSchema = z
  .number()
  .int()
  .min(1, 'Position must be at least 1');

// ─── Answer option schemas ────────────────────────────────────────────────

/**
 * Single answer option for form state.
 */
export const answerOptionSchema = z.object({
  /** Unique key for React list rendering. */
  id: z.string(),
  /** Display order (1-based). */
  position: answerOptionPositionSchema,
  /** Option text. */
  value: answerOptionTextSchema,
  /** Whether this is a correct answer. */
  isCorrect: z.boolean(),
});

/**
 * Array of answer options: 2–6 options.
 */
export const answerOptionsArraySchema = z
  .array(answerOptionSchema)
  .min(
    QUESTION_VALIDATION.OPTIONS_MIN,
    `At least ${QUESTION_VALIDATION.OPTIONS_MIN} answer options are required`,
  )
  .max(
    QUESTION_VALIDATION.OPTIONS_MAX,
    `No more than ${QUESTION_VALIDATION.OPTIONS_MAX} answer options are allowed`,
  );

// ─── Correct answer validation per question type ─────────────────────────

/**
 * Validates correct answer count based on question type.
 *
 * Rules:
 * - `single_choice`: exactly 1 correct answer
 * - `multiple_choice`: at least 1 correct answer
 * - `true_false`: exactly 1 correct answer
 * - `short_answer`: 0 correct answers (auto-graded server-side)
 */
function validateCorrectAnswers(
  options: z.infer<typeof answerOptionsSchema>,
  questionType: z.infer<typeof questionTypeSchema>,
): boolean {
  const correctCount = options.filter((o) => o.isCorrect).length;

  switch (questionType) {
    case 'single_choice':
      return correctCount === 1;
    case 'multiple_choice':
      return correctCount >= 1;
    case 'true_false':
      return correctCount === 1;
    case 'short_answer':
      return correctCount >= 0; // short_answer allows 0 or more
    default:
      return false;
  }
}

const CORRECT_ANSWERS_MESSAGES: Record<z.infer<typeof questionTypeSchema>, string> = {
  single_choice: 'Single choice questions must have exactly 1 correct answer',
  multiple_choice: 'Multiple choice questions must have at least 1 correct answer',
  true_false: 'True/False questions must have exactly 1 correct answer',
  short_answer: 'Short answer questions do not require correct answers',
};

// ─── Single question schema ────────────────────────────────────────────────

/**
 * Form values for creating a single question.
 */
export const createQuestionSchema = z
  .object({
    /** Question text. */
    questionText: questionTextSchema,
    /** Optional image URL. */
    imageUrl: questionImageSchema,
    /** Question type. */
    questionType: questionTypeSchema,
    /** Answer options. */
    answerOptions: answerOptionsArraySchema,
  })
  .refine(
    (data) => validateCorrectAnswers(data.answerOptions, data.questionType),
    {
      message: 'Please mark the correct answer(s)',
      path: ['answerOptions'],
    },
  );

/**
 * Inferred type from the create question schema.
 */
export type CreateQuestionFormValues = z.infer<typeof createQuestionSchema>;

// ─── Bulk question schemas ─────────────────────────────────────────────────

/**
 * Single row in a bulk question creation payload.
 * Note: position is auto-assigned by the server (omitted here).
 */
export const bulkQuestionRowSchema = z.object({
  /** Question text. */
  questionText: questionTextSchema,
  /** Optional image URL. */
  imageUrl: questionImageSchema,
  /** Question type. */
  questionType: questionTypeSchema,
  /** Answer options. */
  answerOptions: answerOptionsArraySchema,
});

/**
 * Bulk question payload: 1–50 rows.
 */
export const bulkQuestionsSchema = z
  .array(bulkQuestionRowSchema)
  .min(
    QUESTION_VALIDATION.BULK_MIN,
    `At least ${QUESTION_VALIDATION.BULK_MIN} question is required`,
  )
  .max(
    QUESTION_VALIDATION.BULK_MAX,
    `No more than ${QUESTION_VALIDATION.BULK_MAX} questions can be added at once`,
  );

/**
 * Inferred type for bulk question rows.
 */
export type BulkQuestionRow = z.infer<typeof bulkQuestionRowSchema>;

/**
 * Inferred type for bulk question payload.
 */
export type BulkQuestionsFormValues = z.infer<typeof bulkQuestionsSchema>;

// ─── CSV/TSV parsing helpers ───────────────────────────────────────────────

/**
 * Parsed row from CSV/TSV paste area.
 */
export interface ParsedBulkRow {
  /** Original row index (0-based). */
  index: number;
  /** Parsed values, or null if parsing failed. */
  values: {
    questionText: string;
    questionType: string;
    options: string[];
    correctIndices: number[];
  } | null;
  /** Error message if parsing failed. */
  error?: string;
}

/**
 * Parse a CSV or TSV string into bulk question rows.
 *
 * Expected format:
 * ```
 * questionText,questionType,option1,option2,correctIndex
 * "What is 2+2?","single_choice","3","4","1"
 * ```
 *
 * @param text - Raw CSV/TSV string
 * @param delimiter - ',' for CSV, '\t' for TSV
 * @param correctIndices - 0-based indices of correct options
 */
export function parseBulkText(
  text: string,
  delimiter: ',' | '\t' = ',',
): ParsedBulkRow[] {
  const lines = text.trim().split('\n');
  const results: ParsedBulkRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;

    try {
      // Simple CSV/TSV parser that handles quoted values
      const values = parseCSVLine(line, delimiter);

      if (values.length < 3) {
        results.push({
          index: i,
          values: null,
          error: 'Row must have at least: question text, type, and 1 option',
        });
        continue;
      }

      const [questionText, questionType, ...rest] = values;

      // Last value might be the correct index (e.g., "1" for option index 1)
      const lastValue = rest[rest.length - 1];
      const correctIndices: number[] = [];

      // Try to parse last value as correct index
      if (lastValue && /^\d+$/.test(lastValue)) {
        const idx = parseInt(lastValue, 10);
        if (idx >= 0 && idx < rest.length - 1) {
          correctIndices.push(idx);
          rest.pop();
        }
      }

      // Parse options - remaining values are options
      const options = rest.map((v) => v.trim()).filter(Boolean);

      if (!options.length) {
        results.push({
          index: i,
          values: null,
          error: 'At least 1 option is required',
        });
        continue;
      }

      // Validate question type
      const validType = QUESTION_TYPE_VALUES.includes(questionType as never);
      if (!validType) {
        results.push({
          index: i,
          values: null,
          error: `Invalid question type: "${questionType}"`,
        });
        continue;
      }

      results.push({
        index: i,
        values: {
          questionText: questionText.trim(),
          questionType,
          options,
          correctIndices,
        },
      });
    } catch {
      results.push({
        index: i,
        values: null,
        error: 'Failed to parse row',
      });
    }
  }

  return results;
}

/**
 * Simple CSV/TSV line parser that handles quoted values.
 */
function parseCSVLine(line: string, delimiter: ',' | '\t'): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
