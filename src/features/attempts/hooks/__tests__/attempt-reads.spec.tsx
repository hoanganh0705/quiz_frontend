/**
 * `attempt-reads.spec.tsx` — focused contract coverage for the
 * Story 4.14 read path.
 *
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.27.
 *
 * Targeted contract:
 *
 *   - The hydration lock-map helper (`buildHydrationLockMap`) projects
 *     the canonical answers list onto a `Record<questionId, ...>`,
 *     preserves last-writer-wins for duplicates, and never produces
 *     a slot for any correctness metadata.
 *   - The active-attempt cache key is scoped by `(sessionId, quizId)`
 *     and the detail / answers keys are scoped by `(sessionId,
 *     attemptId)`, so a tab swap or attempt swap does not leak
 *     between users or attempts.
 *   - The read hooks NEVER reference attempt-review or attempt-
 *     analytics — proven statically by inspecting each hook's
 *     source.
 *
 * The wider behavioural matrix (auth / 401 / 403 / 404 / 429 / 5xx
 * branching, retry, multi-quiz cache keys, hydration auth gating) is
 * covered by the per-hook specs in
 * `useActiveAttempt.spec.tsx` / `useAttemptHydration.spec.tsx`. This
 * spec targets the **projection contract** that the runner binds to
 * and is intended to fail first on any future SDK drift that
 * introduces an unauthorised fetch path.
 */

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { buildHydrationLockMap } from '@/features/attempts/hooks/useAttemptHydration';
import { ATTEMPT_CACHE_KEYS } from '@/features/attempts/types/attempt-runner.types';
import type { AttemptAnswerItemDto } from '@/lib/api/generated/schemas';

const HOOKS_DIR =
  '/home/nguyenhoanganh/Workspace/WebProjects/quiz/quiz_frontend/src/features/attempts/hooks';

function readHook(name: string): string {
  return readFileSync(`${HOOKS_DIR}/${name}`, 'utf8');
}

// ─── Fixtures (player-safe; never carry any correctness metadata) ────────────

const baseAnswer = (
  questionId: string,
  optionId: string,
  submittedAt: string,
): AttemptAnswerItemDto => ({
  questionId,
  selectedOptionId: optionId,
  submittedAt,
});

describe('attempt-reads — projected lock-map shape', () => {
  it('keys the lock map by questionId only', () => {
    const lock = buildHydrationLockMap([
      baseAnswer('q1', 'o1', '2026-08-01T00:00:00.000Z'),
      baseAnswer('q2', 'o2', '2026-08-01T00:00:01.000Z'),
    ]);
    expect(Object.keys(lock).sort()).toEqual(['q1', 'q2']);
    expect(lock['q1']?.selectedOptionId).toBe('o1');
    expect(lock['q2']?.selectedOptionId).toBe('o2');
  });

  it('last writer wins for duplicate questionId entries (server-ordered)', () => {
    const lock = buildHydrationLockMap([
      baseAnswer('q1', 'first', '2026-08-01T00:00:00.000Z'),
      baseAnswer('q1', 'last', '2026-08-01T00:00:02.000Z'),
    ]);
    expect(Object.keys(lock)).toEqual(['q1']);
    expect(lock['q1']?.selectedOptionId).toBe('last');
  });

  it('produces an empty lock map for an empty answers list', () => {
    expect(buildHydrationLockMap([])).toEqual({});
  });

  it('produces an empty lock map for an undefined input (defensive)', () => {
    expect(buildHydrationLockMap(undefined)).toEqual({});
  });
});

describe('attempt-reads — player-DTO invariant under the lock-map projector', () => {
  it('preserves only the documented player-safe fields per answer', () => {
    const lock = buildHydrationLockMap([
      baseAnswer('q1', 'o1', '2026-08-01T00:00:00.000Z'),
    ]);
    expect(Object.keys(lock['q1'] ?? {}).sort()).toEqual([
      'questionId',
      'selectedOptionId',
      'submittedAt',
    ]);
  });
});

describe('attempt-reads — SWR cache key factories', () => {
  it('active key is scoped by session and quiz', () => {
    expect(ATTEMPT_CACHE_KEYS.active('quiz-1', 'user-1')).toEqual([
      'attempts',
      'active',
      'user-1',
      'quiz-1',
    ]);
  });

  it('detail key is scoped by session and attempt', () => {
    expect(ATTEMPT_CACHE_KEYS.detail('attempt-1', 'user-1')).toEqual([
      'attempts',
      'detail',
      'user-1',
      'attempt-1',
    ]);
  });

  it('answers key is scoped by session and attempt', () => {
    expect(ATTEMPT_CACHE_KEYS.answers('attempt-1', 'user-1')).toEqual([
      'attempts',
      'answers',
      'user-1',
      'attempt-1',
    ]);
  });

  it('same inputs produce equal keys (deterministic)', () => {
    const a = ATTEMPT_CACHE_KEYS.active('quiz-1', 'user-1');
    const b = ATTEMPT_CACHE_KEYS.active('quiz-1', 'user-1');
    expect(a).toEqual(b);
    // The factory must be referentially distinct (no module-level
    // cache) so consumers using the result in `useMemo` dependency
    // arrays can rely on equality-by-value.
    expect(a).not.toBe(b);
  });

  it('different inputs produce distinct keys', () => {
    expect(
      ATTEMPT_CACHE_KEYS.active('quiz-1', 'user-1'),
    ).not.toEqual(ATTEMPT_CACHE_KEYS.active('quiz-2', 'user-1'));
    expect(
      ATTEMPT_CACHE_KEYS.detail('attempt-1', 'user-1'),
    ).not.toEqual(ATTEMPT_CACHE_KEYS.detail('attempt-1', 'user-2'));
  });
});

describe('attempt-reads — invariant: no review / analytics reach', () => {
  it('the hydration hook source never references attempt review or analytics', () => {
    const src = readHook('useAttemptHydration.ts');
    expect(src).not.toMatch(/getAttemptReview|getAttemptAnalytics/);
  });

  it('the active-attempt hook source never references attempt review or analytics', () => {
    const src = readHook('useActiveAttempt.ts');
    expect(src).not.toMatch(/getAttemptReview|getAttemptAnalytics/);
  });

  it('the runner orchestrator source never references attempt review or analytics', () => {
    const src = readHook('useAttemptRunner.ts');
    expect(src).not.toMatch(/getAttemptReview|getAttemptAnalytics/);
  });
});
