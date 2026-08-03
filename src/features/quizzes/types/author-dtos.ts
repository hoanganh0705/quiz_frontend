/**
 * Author-side DTOs for the Question Editor (Epic 4.10).
 *
 * CRITICAL INVARIANT: These DTOs include `isCorrect` on answer options.
 * They must NEVER be imported in player-facing components.
 *
 * Components in `features/quizzes/components/QuestionEditor/` are the
 * ONLY consumers of these types. All other quiz components must use
 * the player-safe DTOs from `quiz-backend.ts`.
 *
 * The invariant is enforced by:
 * 1. ESLint rule (no-restricted-imports) — prevents importing `*Author*` DTOs in player contexts
 * 2. Runtime invariant check in QuestionEditor — asserts `isCorrect` fields exist
 *
 * @see EPIC_4_10_TICKETS.md — T-4.10.1
 */

import type {
  QuizQuestionAuthorDto,
  QuizAnswerOptionAuthorDto,
} from '@/lib/api/generated/schemas';

// ─── Re-exports from generated SDK ────────────────────────────────────────

/**
 * Author question DTO — includes `isCorrect` on each answer option.
 * Used exclusively for the question editor (author view).
 *
 * @security This type MUST NOT be used in player-facing components.
 */
export type QuizAuthorQuestionDto = QuizQuestionAuthorDto;

/**
 * Author answer option DTO — includes `isCorrect` boolean.
 * Used exclusively for the question editor (author view).
 *
 * @security This type MUST NOT be used in player-facing components.
 */
export type QuizAuthorAnswerOptionDto = QuizAnswerOptionAuthorDto;

// ─── DTOs for question creation ──────────────────────────────────────────

/**
 * Request payload for creating a single question.
 * Mirrors `CreateQuizQuestionDto` from the generated SDK.
 */
export interface CreateQuestionDto {
  /** Display order (1-based). */
  position: number;
  /** Question text (1–1000 chars). */
  questionText: string;
  /** Optional image URL. */
  imageUrl?: string | null;
  /** Answer options (2–6 for choice types). */
  answerOptions: CreateAnswerOptionDto[];
}

/**
 * Request payload for a single answer option in question creation.
 * Mirrors `CreateQuizAnswerOptionDto` from the generated SDK.
 */
export interface CreateAnswerOptionDto {
  /** Display order (1-based). */
  position: number;
  /** Option text (1–200 chars). */
  value: string;
  /** Whether this is a correct answer. */
  isCorrect: boolean;
}

/**
 * Request payload for bulk question creation.
 * Accepts 1–50 questions per submission.
 */
export interface BulkCreateQuestionsDto {
  /** Questions to create (1–50). */
  questions: CreateQuestionDto[];
}

// ─── DTOs for bulk operation results ──────────────────────────────────────

/**
 * Per-item result from bulk question creation.
 * Returned in `BulkQuestionsResultDto.results[]`.
 */
export interface BulkQuestionResultItem {
  /** Original row index (0-based) from the input array. */
  index: number;
  /** HTTP status code of this item's result. */
  status: number;
  /** Error code (e.g. 'QUIZ_VALIDATION_FAILED'). Empty string on success. */
  code: string;
  /** Human-readable message. Empty string on success. */
  message: string;
  /** Created question ID, if successful. */
  questionId?: string;
}

/**
 * Response from the bulk question creation endpoint.
 */
export interface BulkQuestionsResultDto {
  /** Successfully created questions. */
  questions: QuizAuthorQuestionDto[];
  /** Per-item results (includes failures). */
  results: BulkQuestionResultItem[];
}

// ─── Enums ────────────────────────────────────────────────────────────────

/**
 * Valid question types supported by the question editor.
 */
export const QUESTION_TYPE_VALUES = [
  'single_choice',
  'multiple_choice',
  'true_false',
  'short_answer',
] as const;

export type QuestionType = (typeof QUESTION_TYPE_VALUES)[number];

/**
 * Validation constants for question creation.
 */
export const QUESTION_VALIDATION = {
  /** Question text length bounds. */
  TEXT_MIN: 1,
  TEXT_MAX: 1000,
  /** Answer option text length bounds. */
  OPTION_TEXT_MIN: 1,
  OPTION_TEXT_MAX: 200,
  /** Answer option count bounds (choice types). */
  OPTIONS_MIN: 2,
  OPTIONS_MAX: 6,
  /** Bulk creation limits. */
  BULK_MIN: 1,
  BULK_MAX: 50,
  /** Minimum questions required to publish. */
  PUBLISH_MIN: 5,
} as const;
