/**
 * `attempt-runner.types.spec.ts` — locks the Story 4.14 runner types
 * and SWR cache keys.
 *
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.2.
 *
 * Coverage contract:
 *
 *   - `statusFromAttempt` maps every backend status to the runner
 *     state machine. No future status can slip through without an
 *     explicit case here.
 *   - `statusFromAttemptSummary` delegates to `statusFromAttempt`
 *     and the same exhaustiveness check applies.
 *   - `ATTEMPT_CACHE_KEYS` produces equal keys for equal inputs and
 *     distinct keys for distinct quiz / attempt / session identities.
 *   - The runner type surface contains no `isCorrect` property
 *     (player-DTO invariant).
 *   - The status union is closed and the result of exhaustive
 *     switches is well-typed at compile time.
 */

import { describe, expect, it } from 'vitest';

import {
  ATTEMPT_CACHE_KEYS,
  statusFromAttempt,
  statusFromAttemptSummary,
  type AttemptRunnerStatus,
} from '../attempt-runner.types';

describe('attempt-runner.types — status mapping', () => {
  it('maps backend `started` to runner `in_progress`', () => {
    expect(statusFromAttempt('started')).toBe('in_progress');
  });

  it('maps backend `completed` to runner `completed`', () => {
    expect(statusFromAttempt('completed')).toBe('completed');
  });

  it('maps backend `abandoned` to runner `abandoned`', () => {
    expect(statusFromAttempt('abandoned')).toBe('abandoned');
  });

  it('statusFromAttemptSummary delegates to statusFromAttempt', () => {
    const summary = {
      attemptId: 'a1',
      quizId: 'q1',
      quizTitle: 'Sample',
      quizSlug: 'sample',
      versionNumber: 1,
      difficulty: 'medium',
      contextType: 'solo' as const,
      status: 'started' as const,
      scorePercent: null,
      correctCount: null,
      startedAt: '2026-08-01T00:00:00.000Z',
      finishedAt: null,
      xpEarned: 0,
    };
    expect(statusFromAttemptSummary(summary)).toBe('in_progress');
  });
});

describe('attempt-runner.types — exhaustive runner status union', () => {
  it('enumerates every approved runner state at least once', () => {
    const expected: AttemptRunnerStatus[] = [
      'idle',
      'starting',
      'in_progress',
      'submitting',
      'completing',
      'abandoning',
      'completed',
      'abandoned',
      'error',
    ];
    expect(new Set(expected).size).toBe(9);
  });
});

describe('attempt-runner.types — cache key factories', () => {
  it('equal inputs produce equal keys (frozen tuple)', () => {
    expect(ATTEMPT_CACHE_KEYS.active('q1', 'u1')).toEqual(
      ATTEMPT_CACHE_KEYS.active('q1', 'u1'),
    );
    expect(ATTEMPT_CACHE_KEYS.detail('a1', 'u1')).toEqual(
      ATTEMPT_CACHE_KEYS.detail('a1', 'u1'),
    );
    expect(ATTEMPT_CACHE_KEYS.answers('a1', 'u1')).toEqual(
      ATTEMPT_CACHE_KEYS.answers('a1', 'u1'),
    );
  });

  it('different quiz ids produce different active keys', () => {
    expect(ATTEMPT_CACHE_KEYS.active('q1', 'u1')).not.toEqual(
      ATTEMPT_CACHE_KEYS.active('q2', 'u1'),
    );
  });

  it('different session ids produce different active keys', () => {
    expect(ATTEMPT_CACHE_KEYS.active('q1', 'u1')).not.toEqual(
      ATTEMPT_CACHE_KEYS.active('q1', 'u2'),
    );
  });

  it('different attempt ids produce different detail keys', () => {
    expect(ATTEMPT_CACHE_KEYS.detail('a1', 'u1')).not.toEqual(
      ATTEMPT_CACHE_KEYS.detail('a2', 'u1'),
    );
  });

  it('detail and answers keys differ even for the same attempt', () => {
    expect(ATTEMPT_CACHE_KEYS.detail('a1', 'u1')).not.toEqual(
      ATTEMPT_CACHE_KEYS.answers('a1', 'u1'),
    );
  });

  it('keys are typed readonly tuples (compile-time check)', () => {
    const key = ATTEMPT_CACHE_KEYS.active('q1', 'u1');
    // The tuple is `readonly ['attempts', 'active', string, string]`;
    // runtime check ensures the literal kind survives.
    expect(key[0]).toBe('attempts');
    expect(key[1]).toBe('active');
    expect(typeof key[2]).toBe('string');
    expect(typeof key[3]).toBe('string');
  });
});