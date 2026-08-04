/**
 * `review.types.spec.ts` — locks the review type and cache-key
 * contracts.
 *
 * Source epic:   Epic 4.13.
 * Source ticket: T-4.13.2.
 *
 * The ticket's AC list demands:
 *
 *   - Equal inputs produce equal cache keys.
 *   - Different quiz IDs produce different keys.
 *   - Gate-state switches are exhaustive at compile time.
 *   - No generated DTO is redefined field-for-field.
 *
 * The spec runs in the node env (no jsdom) because the surface is
 * pure data.
 */

import { describe, expect, it } from 'vitest';

import {
  myQuizReviewKey,
  quizReviewsKey,
  reviewQuizAttemptKey,
  type ReviewGateState,
} from '@/features/reviews/types';

describe('reviews/types — cache key factories', () => {
  it('quizReviewsKey starts with the "reviews" + "quiz" discriminators', () => {
    const key = quizReviewsKey('quiz-1');
    expect(key[0]).toBe('reviews');
    expect(key[1]).toBe('quiz');
    expect(key[2]).toBe('quiz-1');
  });

  it('quizReviewsKey embeds the normalized cursor + limit tuple', () => {
    const key = quizReviewsKey('quiz-1', { cursor: 'p2', limit: 10 });
    expect(key[3]).toEqual(['p2', 10]);
  });

  it('equal inputs produce equal quizReviewsKey values', () => {
    const a = quizReviewsKey('quiz-1', { limit: 5 });
    const b = quizReviewsKey('quiz-1', { limit: 5 });
    expect(a).toEqual(b);
  });

  it('different quiz IDs produce different quizReviewsKey values', () => {
    const a = quizReviewsKey('quiz-1');
    const b = quizReviewsKey('quiz-2');
    expect(a).not.toEqual(b);
  });

  it('different filter shapes are reflected in the key tuple', () => {
    const a = quizReviewsKey('quiz-1', { limit: 5 });
    const b = quizReviewsKey('quiz-1', { limit: 10 });
    expect(a[3]).not.toEqual(b[3]);
  });

  it('semantically equivalent filter shapes produce the same key tuple', () => {
    const a = quizReviewsKey('quiz-1', { cursor: undefined, limit: undefined });
    const b = quizReviewsKey('quiz-1');
    expect(a[3]).toEqual(b[3]);
  });

  it('myQuizReviewKey is session-scoped', () => {
    const a = myQuizReviewKey('quiz-1', 'user-1');
    const b = myQuizReviewKey('quiz-1', 'user-2');
    expect(a).not.toEqual(b);
    expect(a[3]).toBe('user-1');
  });

  it('reviewQuizAttemptKey is session-scoped', () => {
    const a = reviewQuizAttemptKey('quiz-1', 'user-1');
    const b = reviewQuizAttemptKey('quiz-1', 'user-2');
    expect(a).not.toEqual(b);
    expect(a[2]).toBe('quiz-1');
  });
});

describe('reviews/types — gate state union is exhaustive at compile time', () => {
  // The exhaustive `switch` below is a type-level test. If a new
  // `kind` is added to `ReviewGateState` without a corresponding
  // case here, TypeScript will flag the `assertNever` call.
  function assertNever(x: never): never {
    throw new Error(`unhandled gate kind: ${JSON.stringify(x)}`);
  }

  function describeGate(state: ReviewGateState): string {
    switch (state.kind) {
      case 'loading':
        return 'loading';
      case 'unauthenticated':
        return 'unauthenticated';
      case 'existing-review':
        return `existing:${state.review.reviewId}`;
      case 'eligible':
        return 'eligible';
      case 'attempt-required':
        return 'attempt-required';
      case 'error':
        return 'error';
      default:
        return assertNever(state);
    }
  }

  it('covers every gate branch', () => {
    const samples: ReviewGateState[] = [
      { kind: 'loading' },
      { kind: 'unauthenticated' },
      { kind: 'existing-review', review: { reviewId: 'r1' } as never },
      { kind: 'eligible' },
      { kind: 'attempt-required' },
      { kind: 'error', error: new Error('boom') },
    ];

    const labels = samples.map(describeGate);
    expect(labels).toEqual([
      'loading',
      'unauthenticated',
      'existing:r1',
      'eligible',
      'attempt-required',
      'error',
    ]);
  });
});
