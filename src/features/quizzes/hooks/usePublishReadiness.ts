/**
 * `usePublishReadiness` — compute publish readiness for a quiz version.
 *
 * Source epic:   Epic 4.11 — Quiz publish flow + edit-published-as-new-draft.
 * Source ticket: T-4.11.3.
 *
 * ## What this hook owns
 *
 * - Computes whether a quiz version is ready to publish (`questionCount >= 5`)
 * - Provides disabled reason and tooltip content for the Publish CTA
 * - Works with `useVersionQuestions` (Epic 4.10) for question count data
 * - Fully synchronous — no API calls
 *
 * ## Publish Readiness Rules
 *
 * - `isReady === true` when `questionCount >= 5`
 * - `isReady === false` with `disabledReason: 'QUIZ_INSUFFICIENT_QUESTIONS'` when `questionCount < 5`
 * - `tooltipContent` is the disabled tooltip text when not ready, `null` when ready
 *
 * ## Usage
 *
 * ```tsx
 * const { isReady, questionCount, disabledReason, tooltipContent } = usePublishReadiness({
 *   questionCount: version?.questions?.length ?? 0,
 * });
 *
 * <Button disabled={!isReady} title={tooltipContent ?? undefined}>
 *   Publish Quiz
 * </Button>
 * ```
 */

'use client';

import {
  computePublishReadiness,
  type PublishReadiness,
} from '@/features/quizzes/types/publish.types';

/** Options for `usePublishReadiness`. */
export interface UsePublishReadinessOptions {
  /** Number of questions in the version. */
  questionCount: number;
}

/** Return value for `usePublishReadiness`. */
export interface UsePublishReadinessReturn extends PublishReadiness {
  /** Always `false` — readiness is computed synchronously. */
  isLoading: false;
}

/**
 * Compute publish readiness for a quiz version.
 *
 * This hook is a thin wrapper around `computePublishReadiness` that
 * provides a consistent interface with other hooks (always returns
 * `isLoading: false` since this is synchronous).
 *
 * @example
 * ```tsx
 * const readiness = usePublishReadiness({ questionCount: 3 });
 * // readiness.isReady === false
 * // readiness.tooltipContent === 'Add at least 5 questions to publish.'
 * ```
 *
 * @example With useVersionQuestions
 * ```tsx
 * const { questions } = useVersionQuestions({ quizId, versionId });
 * const readiness = usePublishReadiness({ questionCount: questions.length });
 *
 * return (
 *   <PublishCta isReady={readiness.isReady} tooltipContent={readiness.tooltipContent} />
 * );
 * ```
 */
export function usePublishReadiness(
  options: UsePublishReadinessOptions,
): UsePublishReadinessReturn {
  const { questionCount } = options;

  const readiness = computePublishReadiness(questionCount);

  return {
    ...readiness,
    // Always false — readiness is computed synchronously, never loading
    isLoading: false,
  };
}
