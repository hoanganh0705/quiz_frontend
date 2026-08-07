/**
 * `features/admin/achievement-admin/__tests__/achievement-admin-types.spec.ts`
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.B1.
 */

import { expect, test } from 'vitest';

import {
  isReevalTerminal,
  isReevalRunning,
  getReevalLifecycleLabel,
  REEVAL_LIFECYCLE_IDLE,
  REEVAL_LIFECYCLE_RUNNING,
  REEVAL_LIFECYCLE_COMPLETED,
  REEVAL_LIFECYCLE_FAILED,
} from '../achievement-admin-types';

// ─── isReevalTerminal ───────────────────────────────────────────────────────

test('isReevalTerminal — idle is not terminal', () => {
  expect(isReevalTerminal(REEVAL_LIFECYCLE_IDLE)).toBe(false);
});

test('isReevalTerminal — running is not terminal', () => {
  expect(isReevalTerminal(REEVAL_LIFECYCLE_RUNNING)).toBe(false);
});

test('isReevalTerminal — completed is terminal', () => {
  expect(isReevalTerminal(REEVAL_LIFECYCLE_COMPLETED)).toBe(true);
});

test('isReevalTerminal — failed is terminal', () => {
  expect(isReevalTerminal(REEVAL_LIFECYCLE_FAILED)).toBe(true);
});

// ─── isReevalRunning ─────────────────────────────────────────────────────────

test('isReevalRunning — only running is true', () => {
  expect(isReevalRunning(REEVAL_LIFECYCLE_IDLE)).toBe(false);
  expect(isReevalRunning(REEVAL_LIFECYCLE_RUNNING)).toBe(true);
  expect(isReevalRunning(REEVAL_LIFECYCLE_COMPLETED)).toBe(false);
  expect(isReevalRunning(REEVAL_LIFECYCLE_FAILED)).toBe(false);
});

// ─── getReevalLifecycleLabel ─────────────────────────────────────────────────

test('getReevalLifecycleLabel — returns correct labels for every state', () => {
  expect(getReevalLifecycleLabel(REEVAL_LIFECYCLE_IDLE)).toBe(
    'Re-evaluate achievements',
  );
  expect(getReevalLifecycleLabel(REEVAL_LIFECYCLE_RUNNING)).toBe(
    'Re-evaluation running…',
  );
  expect(getReevalLifecycleLabel(REEVAL_LIFECYCLE_COMPLETED)).toBe(
    'Re-evaluate again',
  );
  expect(getReevalLifecycleLabel(REEVAL_LIFECYCLE_FAILED)).toBe(
    'Retry re-evaluation',
  );
});

test('getReevalLifecycleLabel — exhaustive switch covers all states', () => {
  // This test exists to enforce that every ReevalLifecycle state
  // has a label in the switch. Adding a new state without updating
  // getReevalLifecycleLabel produces a TypeScript error (never type).
  const states = [
    REEVAL_LIFECYCLE_IDLE,
    REEVAL_LIFECYCLE_RUNNING,
    REEVAL_LIFECYCLE_COMPLETED,
    REEVAL_LIFECYCLE_FAILED,
  ] as const;
  states.forEach((state) => {
    expect(typeof getReevalLifecycleLabel(state)).toBe('string');
    expect(getReevalLifecycleLabel(state).length).toBeGreaterThan(0);
  });
});

// ─── ReevalLifecycle constant values ─────────────────────────────────────────

test('ReevalLifecycle constants are literal strings', () => {
  expect(REEVAL_LIFECYCLE_IDLE).toBe('idle');
  expect(REEVAL_LIFECYCLE_RUNNING).toBe('running');
  expect(REEVAL_LIFECYCLE_COMPLETED).toBe('completed');
  expect(REEVAL_LIFECYCLE_FAILED).toBe('failed');
});
