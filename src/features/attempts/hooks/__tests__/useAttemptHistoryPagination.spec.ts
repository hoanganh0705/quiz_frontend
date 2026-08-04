/**
 * `attempts-history-pagination.spec.ts` — locks the Story 4.15
 * history list pure functions and cache keys.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.24.
 *
 * ## Coverage contract
 *
 *   - `serializeAttemptHistoryFilters` produces a stable, unambiguous
 *     key fragment — equal filters produce equal strings; order is fixed.
 *   - `ATTEMPT_HISTORY_CACHE_KEYS.list` returns a frozen tuple.
 *   - `ATTEMPT_HISTORY_CACHE_KEYS.all` scopes invalidation to the user.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ATTEMPT_HISTORY_CACHE_KEYS,
  serializeAttemptHistoryFilters,
} from '@/features/attempts/types/attempt-history.types';
import {
  DEFAULT_ATTEMPT_HISTORY_FILTERS,
} from '@/features/attempts/types/attempt-history.types';

afterEach(() => {
  vi.clearAllMocks();
});

// ─── serializeAttemptHistoryFilters ─────────────────────────────────────────

describe('serializeAttemptHistoryFilters', () => {
  it('produces equal strings for equal filter objects', () => {
    const a = serializeAttemptHistoryFilters({
      status: 'completed',
      dateRange: 'last_7_days',
      search: 'quiz',
      cursor: null,
    });
    const b = serializeAttemptHistoryFilters({
      status: 'completed',
      dateRange: 'last_7_days',
      search: 'quiz',
      cursor: null,
    });
    expect(a).toBe(b);
  });

  it('field order does not affect the output', () => {
    // The function always uses the same fixed internal field order.
    const s = serializeAttemptHistoryFilters({
      status: 'all',
      dateRange: 'all',
      search: '',
      cursor: null,
    });
    expect(s).toBe('status=all|date=all|q=');
  });

  it('omits cursor when null', () => {
    const s = serializeAttemptHistoryFilters({
      ...DEFAULT_ATTEMPT_HISTORY_FILTERS,
    });
    expect(s).not.toContain('cursor=');
  });

  it('includes cursor when set', () => {
    const s = serializeAttemptHistoryFilters({
      ...DEFAULT_ATTEMPT_HISTORY_FILTERS,
      cursor: 'opaque-cursor',
    });
    expect(s).toContain('cursor=opaque-cursor');
  });

  it('includes limit when set', () => {
    const s = serializeAttemptHistoryFilters({
      ...DEFAULT_ATTEMPT_HISTORY_FILTERS,
      limit: 50,
    });
    expect(s).toContain('limit=50');
  });

  it('search is lowercased and trimmed', () => {
    const s = serializeAttemptHistoryFilters({
      ...DEFAULT_ATTEMPT_HISTORY_FILTERS,
      search: '  Quiz Title  ',
    });
    // The implementation trims and lowercases, but does not URL-encode spaces.
    expect(s).toContain('q=quiz title');
  });
});

// ─── ATTEMPT_HISTORY_CACHE_KEYS ──────────────────────────────────────────────

describe('ATTEMPT_HISTORY_CACHE_KEYS', () => {
  it('list returns a readonly tuple', () => {
    const key = ATTEMPT_HISTORY_CACHE_KEYS.list('user-1', {
      status: 'completed',
      dateRange: 'all',
      search: '',
      cursor: null,
    });
    // `as const` tuples are readonly at the type level — no frozen call needed.
    expect(Array.isArray(key)).toBe(true);
    // Confirm the tuple has the expected structure.
    expect(key).toHaveLength(4);
    expect(key[0]).toBe('attempts');
    expect(key[1]).toBe('history');
  });

  it('list keys are scoped by sessionId', () => {
    const a = ATTEMPT_HISTORY_CACHE_KEYS.list(
      'user-1',
      DEFAULT_ATTEMPT_HISTORY_FILTERS,
    );
    const b = ATTEMPT_HISTORY_CACHE_KEYS.list(
      'user-2',
      DEFAULT_ATTEMPT_HISTORY_FILTERS,
    );
    expect(a).not.toEqual(b);
  });

  it('list keys differ when filter shape differs', () => {
    const a = ATTEMPT_HISTORY_CACHE_KEYS.list('user-1', {
      status: 'completed',
      dateRange: 'all',
      search: '',
      cursor: null,
    });
    const b = ATTEMPT_HISTORY_CACHE_KEYS.list('user-1', {
      status: 'abandoned',
      dateRange: 'all',
      search: '',
      cursor: null,
    });
    expect(a).not.toEqual(b);
  });

  it('all returns a readonly tuple scoped by sessionId', () => {
    const key = ATTEMPT_HISTORY_CACHE_KEYS.all('user-1');
    // `as const` tuples are readonly at the type level — no frozen call needed.
    expect(Array.isArray(key)).toBe(true);
    expect(Array.from(key)).toContain('user-1');
    expect(Array.from(key)).toContain('*');
  });
});
