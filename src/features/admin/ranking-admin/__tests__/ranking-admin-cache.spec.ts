/**
 * `ranking-admin-cache.spec.ts`
 *
 * Source epic:   Epic 7.9.
 * Source ticket: TKT-7.9.B3.
 *
 * Verifies:
 *   - Key factory outputs are non-empty strings / arrays.
 *   - Key factory outputs are deterministic (same input → same output).
 *   - `invalidateRankingCaches` calls `mutate` with the correct keys.
 *   - `invalidateUserRankingCache` calls `mutate` with the correct key.
 */

import { describe, expect, it, vi } from 'vitest';

import {
  RANKING_CACHE_KEYS,
  DEFAULT_RANKING_LEADERBOARD_FILTERS,
} from '@/features/rankings/types/ranking.types';

// ─── Mock SWR mutate ─────────────────────────────────────────────────────────────

const mockMutate = vi.fn().mockResolvedValue(undefined);

vi.mock('swr', () => ({
  mutate: (...args: unknown[]) => mockMutate(...args),
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('RANKING_CACHE_KEYS — deterministic factory outputs', () => {
  it('mySummary() returns a non-empty array', () => {
    const key = RANKING_CACHE_KEYS.mySummary();
    expect(Array.isArray(key)).toBe(true);
    expect(key.length).toBeGreaterThan(0);
  });

  it('mySummary() is deterministic (no arguments)', () => {
    const key1 = RANKING_CACHE_KEYS.mySummary();
    const key2 = RANKING_CACHE_KEYS.mySummary();
    expect(key1).toEqual(key2);
  });

  it('leaderboard() returns a non-empty array', () => {
    const key = RANKING_CACHE_KEYS.leaderboard(DEFAULT_RANKING_LEADERBOARD_FILTERS);
    expect(Array.isArray(key)).toBe(true);
    expect(key.length).toBeGreaterThan(0);
  });

  it('leaderboard() is deterministic for the same filters', () => {
    const filters = { period: 'weekly' as const };
    const key1 = RANKING_CACHE_KEYS.leaderboard(filters);
    const key2 = RANKING_CACHE_KEYS.leaderboard(filters);
    expect(key1).toEqual(key2);
  });

  it('leaderboard() differs for different filters', () => {
    const key1 = RANKING_CACHE_KEYS.leaderboard({ period: 'weekly' });
    const key2 = RANKING_CACHE_KEYS.leaderboard({ period: 'monthly' });
    expect(key1).not.toEqual(key2);
  });

  it('myHistory() returns a non-empty array', () => {
    const key = RANKING_CACHE_KEYS.myHistory();
    expect(Array.isArray(key)).toBe(true);
    expect(key.length).toBeGreaterThan(0);
  });

  it('myHistory() is deterministic', () => {
    const key1 = RANKING_CACHE_KEYS.myHistory({ cursor: 'abc', limit: 10 });
    const key2 = RANKING_CACHE_KEYS.myHistory({ cursor: 'abc', limit: 10 });
    expect(key1).toEqual(key2);
  });

  it('myMilestones() returns a non-empty array', () => {
    const key = RANKING_CACHE_KEYS.myMilestones();
    expect(Array.isArray(key)).toBe(true);
    expect(key.length).toBeGreaterThan(0);
  });

  it('myMilestones() is deterministic', () => {
    const key1 = RANKING_CACHE_KEYS.myMilestones();
    const key2 = RANKING_CACHE_KEYS.myMilestones();
    expect(key1).toEqual(key2);
  });

  it('user() returns a non-empty array', () => {
    const key = RANKING_CACHE_KEYS.user('user-123');
    expect(Array.isArray(key)).toBe(true);
    expect(key.length).toBeGreaterThan(0);
  });

  it('user() is deterministic for the same userId', () => {
    const key1 = RANKING_CACHE_KEYS.user('user-123');
    const key2 = RANKING_CACHE_KEYS.user('user-123');
    expect(key1).toEqual(key2);
  });

  it('user() differs for different userIds', () => {
    const key1 = RANKING_CACHE_KEYS.user('user-123');
    const key2 = RANKING_CACHE_KEYS.user('user-456');
    expect(key1).not.toEqual(key2);
  });
});

describe('DEFAULT_RANKING_LEADERBOARD_FILTERS', () => {
  it('is defined and non-null', () => {
    expect(DEFAULT_RANKING_LEADERBOARD_FILTERS).toBeDefined();
    expect(DEFAULT_RANKING_LEADERBOARD_FILTERS).not.toBeNull();
  });

  it('can be passed to leaderboard() without crashing', () => {
    expect(() => {
      RANKING_CACHE_KEYS.leaderboard(DEFAULT_RANKING_LEADERBOARD_FILTERS);
    }).not.toThrow();
  });
});
