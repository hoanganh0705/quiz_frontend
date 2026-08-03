/**
 * Publish-specific types and SWR key factory — Epic 4.11.
 *
 * Source epic:   Epic 4.11 — Quiz publish flow + edit-published-as-new-draft.
 * Source ticket: T-4.11.2.
 *
 * ## Types
 *
 * - `PublishReadiness` — computed state from question count
 * - `PublishResult` — the result of publishing (QuizVersionResponseDto)
 *
 * ## SWR Key Factory
 *
 * - `publishResultKey(quizId, versionId)` — SWR cache key for publish result
 *
 * ## Publish Readiness Rules
 *
 * A quiz version is ready to publish when it has >= 5 questions.
 * This threshold is enforced both client-side (this module) and
 * server-side (POST /quizzes/:id/versions/:versionId/publish).
 */

import type { QuizVersionResponseDto } from '@/lib/api/generated/schemas';

/** Minimum number of questions required to publish a quiz. */
export const PUBLISH_MIN_QUESTIONS = 5;

/** SWR key for the publish result cache. */
export function publishResultKey(
  quizId: string,
  versionId: string,
): ['quiz', 'publish', string, string] {
  return ['quiz', 'publish', quizId, versionId];
}

/**
 * Publish readiness state — computed from question count.
 *
 * Computed synchronously from version data (no API calls).
 */
export interface PublishReadiness {
  /** Whether the version is ready to publish (questionCount >= 5). */
  isReady: boolean;
  /** Current number of questions. */
  questionCount: number;
  /** Minimum required questions (constant: 5). */
  minRequired: number;
  /** Error code for the disabled reason when not ready. */
  disabledReason: 'QUIZ_INSUFFICIENT_QUESTIONS' | null;
  /** Tooltip content string when disabled, null when ready. */
  tooltipContent: string | null;
}

/**
 * Result of publishing a quiz version.
 * Alias for the API response type.
 */
export type PublishResult = QuizVersionResponseDto;

/**
 * Compute publish readiness from a question count.
 *
 * @param questionCount - Number of questions in the version
 * @returns PublishReadiness state
 *
 * @example
 * ```ts
 * const readiness = computePublishReadiness(3);
 * // { isReady: false, questionCount: 3, minRequired: 5, disabledReason: 'QUIZ_INSUFFICIENT_QUESTIONS', tooltipContent: 'Add at least 5 questions to publish.' }
 * ```
 */
export function computePublishReadiness(questionCount: number): PublishReadiness {
  const isReady = questionCount >= PUBLISH_MIN_QUESTIONS;

  return {
    isReady,
    questionCount,
    minRequired: PUBLISH_MIN_QUESTIONS,
    disabledReason: isReady ? null : 'QUIZ_INSUFFICIENT_QUESTIONS',
    tooltipContent: isReady
      ? null
      : `Add at least ${PUBLISH_MIN_QUESTIONS} questions to publish.`,
  };
}
