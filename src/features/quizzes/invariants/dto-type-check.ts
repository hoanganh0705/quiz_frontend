/**
 * `dto-type-check.ts` — Author DTO invariant enforcement utilities.
 *
 * Source epic:   Epic 4.10 — Question editor (single + bulk).
 * Source ticket: T-4.10.22.
 *
 * ## CRITICAL INVARIANT
 *
 * The author DTOs (`QuizAuthorQuestionDto`, `QuizAuthorAnswerOptionDto`) include
 * the `isCorrect` field, which MUST NEVER be exposed to player-facing components.
 *
 * This module provides runtime checks to detect violations of this invariant.
 *
 * ## Defense in Depth
 *
 * 1. **Type-level**: ESLint rule `no-restricted-imports` prevents importing
 *    `*Author*` DTOs in non-author contexts (enforced at lint time).
 *
 * 2. **Runtime**: `assertAuthorQuestionDto()` checks that `isCorrect` exists
 *    on answer options, logging to Sentry if the invariant is violated.
 *
 * ## Usage
 *
 * Call `assertAuthorQuestionDto(questions)` at the top-level of any component
 * that receives question DTOs from the API.
 *
 * @example
 * ```typescript
 * function QuestionEditor({ questions }) {
 *   assertAuthorQuestionDto(questions);
 *   // ... rest of component
 * }
 * ```
 */

import * as Sentry from '@sentry/nextjs';

import type { QuizAuthorQuestionDto } from '@/features/quizzes/types/author-dtos';

// ─── Error type ─────────────────────────────────────────────────────────

/**
 * Error thrown when the Author DTO invariant is violated.
 */
export class AuthorDtoInvariantError extends Error {
  public readonly questionId: string | undefined;
  public readonly optionId: string | undefined;

  constructor(
    message: string,
    questionId?: string,
    optionId?: string,
  ) {
    super(message);
    this.name = 'AuthorDtoInvariantError';
    this.questionId = questionId;
    this.optionId = optionId;
  }
}

// ─── Detection helpers ─────────────────────────────────────────────────

/**
 * Check if an answer option is an author DTO (has `isCorrect` field).
 */
function hasIsCorrectField(option: unknown): option is { isCorrect: boolean } {
  return (
    typeof option === 'object' &&
    option !== null &&
    'isCorrect' in option
  );
}

/**
 * Check if a question is an author DTO (all options have `isCorrect`).
 */
function isAuthorQuestion(question: unknown): question is QuizAuthorQuestionDto {
  if (typeof question !== 'object' || question === null) {
    return false;
  }

  const q = question as Record<string, unknown>;

  // Check for answerOptions array
  if (!Array.isArray(q.answerOptions)) {
    return true; // No options means we can't check
  }

  // All options must have `isCorrect`
  return q.answerOptions.every((opt) => hasIsCorrectField(opt));
}

// ─── Assertion function ────────────────────────────────────────────────

/**
 * Assert that the provided questions are author DTOs (with `isCorrect`).
 *
 * Throws `AuthorDtoInvariantError` if any option is missing `isCorrect`,
 * which indicates a player DTO was accidentally passed to an author component.
 *
 * Also logs the violation to Sentry for monitoring.
 *
 * @param questions - Array of questions to check
 * @throws `AuthorDtoInvariantError` if invariant is violated
 */
export function assertAuthorQuestionDto(questions: QuizAuthorQuestionDto[]): void {
  for (const question of questions) {
    if (!question.answerOptions) continue;

    for (const option of question.answerOptions) {
      if (!hasIsCorrectField(option)) {
        // Log to Sentry
        Sentry.captureException(
          new AuthorDtoInvariantError(
            'Author DTO invariant violation: isCorrect field missing from answer option',
            question.questionId,
            undefined,
          ),
          {
            tags: {
              feature: 'question-editor',
              invariant: 'author-dto',
            },
            extra: {
              questionId: question.questionId,
              quizVersionId: question.quizVersionId,
              position: question.position,
            },
          },
        );

        throw new AuthorDtoInvariantError(
          `Data integrity check failed: expected author DTO with isCorrect field (question: ${question.questionId})`,
          question.questionId,
          undefined,
        );
      }
    }
  }
}

/**
 * Check if the given data appears to be a player DTO (no `isCorrect` on options).
 *
 * This is a non-throwing version for UI purposes (e.g., showing an error state
 * instead of crashing).
 */
export function isPlayerQuestion(question: unknown): boolean {
  if (typeof question !== 'object' || question === null) {
    return false;
  }

  const q = question as Record<string, unknown>;

  if (!Array.isArray(q.answerOptions)) {
    return false;
  }

  // If options exist and at least one has no `isCorrect`, it's likely a player DTO
  if (q.answerOptions.length > 0) {
    return !q.answerOptions.every((opt) => hasIsCorrectField(opt));
  }

  return false;
}
