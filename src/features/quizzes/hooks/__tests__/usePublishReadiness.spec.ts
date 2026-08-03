/**
 * `usePublishReadiness.spec.ts` — unit tests for publish readiness.
 *
 * Source epic:   Epic 4.11 — Quiz publish flow + edit-published-as-new-draft.
 * Source ticket: T-4.11.4.
 *
 * Tests the usePublishReadiness hook and computePublishReadiness function for:
 * - isReady === true for questionCount >= 5
 * - isReady === false for questionCount < 5
 * - tooltip content when disabled
 * - null tooltip when ready
 * - boundary cases (0, 1, 4, 5, 10 questions)
 *
 * Note: Since usePublishReadiness is a thin synchronous wrapper around
 * computePublishReadiness, we test the function directly. The hook's
 * only responsibility is to spread the result + isLoading: false.
 */

import { describe, expect, it } from 'vitest';

import { PUBLISH_MIN_QUESTIONS, computePublishReadiness } from '@/features/quizzes/types/publish.types';
import { usePublishReadiness } from '@/features/quizzes/hooks/usePublishReadiness';

describe('computePublishReadiness', () => {
  it('returns isReady: true when questionCount >= 5', () => {
    expect(computePublishReadiness(5).isReady).toBe(true);
    expect(computePublishReadiness(6).isReady).toBe(true);
    expect(computePublishReadiness(10).isReady).toBe(true);
    expect(computePublishReadiness(100).isReady).toBe(true);
  });

  it('returns isReady: false when questionCount < 5', () => {
    expect(computePublishReadiness(0).isReady).toBe(false);
    expect(computePublishReadiness(1).isReady).toBe(false);
    expect(computePublishReadiness(2).isReady).toBe(false);
    expect(computePublishReadiness(3).isReady).toBe(false);
    expect(computePublishReadiness(4).isReady).toBe(false);
  });

  it('returns disabledReason: null when isReady is true', () => {
    expect(computePublishReadiness(5).disabledReason).toBeNull();
    expect(computePublishReadiness(10).disabledReason).toBeNull();
  });

  it('returns disabledReason: QUIZ_INSUFFICIENT_QUESTIONS when isReady is false', () => {
    expect(computePublishReadiness(0).disabledReason).toBe('QUIZ_INSUFFICIENT_QUESTIONS');
    expect(computePublishReadiness(4).disabledReason).toBe('QUIZ_INSUFFICIENT_QUESTIONS');
  });

  it('returns null tooltipContent when isReady is true', () => {
    expect(computePublishReadiness(5).tooltipContent).toBeNull();
    expect(computePublishReadiness(10).tooltipContent).toBeNull();
  });

  it('returns correct tooltipContent when isReady is false', () => {
    const tooltip = computePublishReadiness(3).tooltipContent;
    expect(tooltip).not.toBeNull();
    expect(tooltip).toContain(String(PUBLISH_MIN_QUESTIONS));
    expect(tooltip).toContain('Add at least');
    expect(tooltip).toContain('questions to publish');
  });

  it('returns correct questionCount in output', () => {
    expect(computePublishReadiness(0).questionCount).toBe(0);
    expect(computePublishReadiness(3).questionCount).toBe(3);
    expect(computePublishReadiness(10).questionCount).toBe(10);
  });

  it('returns PUBLISH_MIN_QUESTIONS as minRequired', () => {
    expect(computePublishReadiness(0).minRequired).toBe(PUBLISH_MIN_QUESTIONS);
    expect(computePublishReadiness(5).minRequired).toBe(PUBLISH_MIN_QUESTIONS);
    expect(computePublishReadiness(10).minRequired).toBe(PUBLISH_MIN_QUESTIONS);
  });

  it('boundary: exactly 5 questions is ready', () => {
    const result = computePublishReadiness(5);
    expect(result.isReady).toBe(true);
    expect(result.disabledReason).toBeNull();
    expect(result.tooltipContent).toBeNull();
  });

  it('boundary: 4 questions is not ready', () => {
    const result = computePublishReadiness(4);
    expect(result.isReady).toBe(false);
    expect(result.disabledReason).toBe('QUIZ_INSUFFICIENT_QUESTIONS');
    expect(result.tooltipContent).not.toBeNull();
  });

  it('boundary: 0 questions is not ready', () => {
    const result = computePublishReadiness(0);
    expect(result.isReady).toBe(false);
    expect(result.disabledReason).toBe('QUIZ_INSUFFICIENT_QUESTIONS');
    expect(result.tooltipContent).not.toBeNull();
  });
});

describe('usePublishReadiness', () => {
  // The hook is a thin synchronous wrapper that spreads computePublishReadiness
  // + adds isLoading: false. We test the contract directly.

  it('returns isReady: true for questionCount >= 5', () => {
    const result = usePublishReadiness({ questionCount: 5 });
    expect(result.isReady).toBe(true);
  });

  it('returns isReady: false for questionCount < 5', () => {
    const result = usePublishReadiness({ questionCount: 3 });
    expect(result.isReady).toBe(false);
  });

  it('returns isLoading: false (always synchronous)', () => {
    const result = usePublishReadiness({ questionCount: 5 });
    expect(result.isLoading).toBe(false);
  });

  it('returns correct disabledReason when not ready', () => {
    const result = usePublishReadiness({ questionCount: 2 });
    expect(result.disabledReason).toBe('QUIZ_INSUFFICIENT_QUESTIONS');
  });

  it('returns null disabledReason when ready', () => {
    const result = usePublishReadiness({ questionCount: 7 });
    expect(result.disabledReason).toBeNull();
  });

  it('returns tooltipContent when not ready', () => {
    const result = usePublishReadiness({ questionCount: 2 });
    expect(result.tooltipContent).not.toBeNull();
    expect(result.tooltipContent).toContain(String(PUBLISH_MIN_QUESTIONS));
  });

  it('returns null tooltipContent when ready', () => {
    const result = usePublishReadiness({ questionCount: 10 });
    expect(result.tooltipContent).toBeNull();
  });

  it('returns correct questionCount', () => {
    const result = usePublishReadiness({ questionCount: 6 });
    expect(result.questionCount).toBe(6);
  });

  it('returns correct minRequired', () => {
    const result = usePublishReadiness({ questionCount: 0 });
    expect(result.minRequired).toBe(PUBLISH_MIN_QUESTIONS);
  });

  it('returns the same shape as computePublishReadiness plus isLoading', () => {
    const fnResult = computePublishReadiness(4);
    const hookResult = usePublishReadiness({ questionCount: 4 });

    expect(hookResult.isReady).toBe(fnResult.isReady);
    expect(hookResult.questionCount).toBe(fnResult.questionCount);
    expect(hookResult.minRequired).toBe(fnResult.minRequired);
    expect(hookResult.disabledReason).toBe(fnResult.disabledReason);
    expect(hookResult.tooltipContent).toBe(fnResult.tooltipContent);
    expect(hookResult.isLoading).toBe(false); // Only difference from fn
  });

  it('boundary: exactly 5 questions is ready', () => {
    const result = usePublishReadiness({ questionCount: 5 });
    expect(result.isReady).toBe(true);
    expect(result.tooltipContent).toBeNull();
  });

  it('boundary: 4 questions is not ready', () => {
    const result = usePublishReadiness({ questionCount: 4 });
    expect(result.isReady).toBe(false);
    expect(result.disabledReason).toBe('QUIZ_INSUFFICIENT_QUESTIONS');
    expect(result.tooltipContent).not.toBeNull();
  });
});
