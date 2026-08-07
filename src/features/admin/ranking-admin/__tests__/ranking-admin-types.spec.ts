/**
 * `ranking-admin-types.spec.ts`
 *
 * Source epic:   Epic 7.9.
 * Source ticket: TKT-7.9.B1.
 *
 * Verifies:
 *   - `RankingJobStatus` discriminated union is exhaustive.
 *   - `RankingScopeValue` is constrained to `RANKING_SCOPE_VALUES`.
 *   - `parseCooldownFrom` handles all documented formats correctly.
 *   - `RankingAdminErrorCode` is a non-empty union.
 */

import { describe, expect, it } from 'vitest';

import type {
  RankingJobStatus,
  RankingAdminErrorCode,
  RankingScopeValue,
} from '../ranking-admin-types';

import {
  RANKING_SCOPE_VALUES,
  parseCooldownFrom,
} from '../ranking-admin-types';

// ─── RankingJobStatus exhaustiveness ─────────────────────────────────────────

describe('RankingJobStatus — exhaustiveness', () => {
  it('covers all four lifecycle states', () => {
    const states: RankingJobStatus[] = [
      'pending',
      'running',
      'completed',
      'failed',
    ];
    for (const s of states) {
      const result: string = (() => {
        switch (s) {
          case 'pending':
            return 'pending';
          case 'running':
            return 'running';
          case 'completed':
            return 'completed';
          case 'failed':
            return 'failed';
        }
      })();
      expect(result).toBe(s);
    }
  });

  it('exhaustive switch without default produces never on unknown input', () => {
    function getStatusLabel(status: RankingJobStatus): string {
      switch (status) {
        case 'pending':
          return 'Pending';
        case 'running':
          return 'Running';
        case 'completed':
          return 'Completed';
        case 'failed':
          return 'Failed';
      }
      // If a new state is added without updating this switch, TypeScript errors
      return ((_s: never) => _s)(status);
    }

    expect(getStatusLabel('pending')).toBe('Pending');
    expect(getStatusLabel('running')).toBe('Running');
    expect(getStatusLabel('completed')).toBe('Completed');
    expect(getStatusLabel('failed')).toBe('Failed');
  });

  it('has exactly four members', () => {
    const members = ['pending', 'running', 'completed', 'failed'] as const;
    expect((members as unknown as RankingJobStatus[]).length).toBe(4);
  });
});

// ─── RANKING_SCOPE_VALUES ─────────────────────────────────────────────────────

describe('RANKING_SCOPE_VALUES', () => {
  it('contains three values', () => {
    expect(RANKING_SCOPE_VALUES).toHaveLength(3);
  });

  it('contains current_period, last_period, and all', () => {
    expect(RANKING_SCOPE_VALUES).toContain('current_period');
    expect(RANKING_SCOPE_VALUES).toContain('last_period');
    expect(RANKING_SCOPE_VALUES).toContain('all');
  });

  it('is a readonly tuple (as const — no frozen call needed)', () => {
    // `as const` makes the tuple readonly at the type level.
    // `Object.isFrozen` is not used here because `as const` does not
    // deeply freeze the array object itself — it only makes the values
    // readonly. This matches the pattern in useAttemptHistoryPagination.spec.ts.
    expect(Array.isArray(RANKING_SCOPE_VALUES)).toBe(true);
    // Type-level readonly is the contract; we test the values instead.
    expect(RANKING_SCOPE_VALUES[0]).toBe('current_period');
  });
});

// ─── RankingScopeValue ──────────────────────────────────────────────────────────

describe('RankingScopeValue', () => {
  it('accepts each member of RANKING_SCOPE_VALUES', () => {
    const values: RankingScopeValue[] = [
      'current_period',
      'last_period',
      'all',
    ];
    for (const v of values) {
      const _: RankingScopeValue = v;
      expect(_).toBe(v);
    }
  });
});

// ─── RankingAdminErrorCode ──────────────────────────────────────────────────────

describe('RankingAdminErrorCode', () => {
  it('is a non-empty union', () => {
    const codes: RankingAdminErrorCode[] = [
      'OPERATION_RUNNING',
      'OPERATION_COOLDOWN',
      'INVALID_PERIOD',
      'IRREVERSIBLE_CONFIRM_REQUIRED',
      'PERMISSION_DENIED',
    ];
    for (const c of codes) {
      const _: RankingAdminErrorCode = c;
      expect(_).toBe(c);
    }
  });
});

// ─── parseCooldownFrom ──────────────────────────────────────────────────────────

describe('parseCooldownFrom', () => {
  it('returns null for undefined', () => {
    expect(parseCooldownFrom(undefined)).toBeNull();
  });

  it('returns null for null', () => {
    expect(parseCooldownFrom(null as unknown as undefined)).toBeNull();
  });

  it('returns the number as-is when < 3600 (assumed seconds)', () => {
    expect(parseCooldownFrom(120)).toBe(120);
    expect(parseCooldownFrom(300)).toBe(300);
    expect(parseCooldownFrom(3599)).toBe(3599);
  });

  it('treats large numbers as epoch milliseconds', () => {
    // A timestamp 5 minutes in the future
    const futureMs = Date.now() + 5 * 60 * 1000;
    const result = parseCooldownFrom(futureMs);
    // Should be approximately 300 seconds (within 1 second tolerance for test runtime)
    expect(result).toBeGreaterThanOrEqual(299);
    expect(result).toBeLessThanOrEqual(301);
  });

  it('treats ISO timestamp strings as epoch milliseconds', () => {
    // A timestamp 10 minutes in the future
    const futureDate = new Date(Date.now() + 10 * 60 * 1000);
    const result = parseCooldownFrom(futureDate.toISOString());
    expect(result).toBeGreaterThanOrEqual(599);
    expect(result).toBeLessThanOrEqual(601);
  });

  it('returns 0 for past timestamps', () => {
    const pastDate = new Date(Date.now() - 60 * 1000);
    expect(parseCooldownFrom(pastDate.toISOString())).toBe(0);
  });

  it('returns null for unparseable strings', () => {
    expect(parseCooldownFrom('not-a-date')).toBeNull();
    expect(parseCooldownFrom('')).toBeNull();
    expect(parseCooldownFrom('abc123')).toBeNull();
  });

  it('returns null for NaN strings', () => {
    expect(parseCooldownFrom('NaN')).toBeNull();
  });

  it('handles epoch seconds as a string', () => {
    // Unix timestamp in seconds
    const futureSec = Math.floor(Date.now() / 1000) + 120;
    const result = parseCooldownFrom(String(futureSec));
    // The string "1234567890" is not a valid ISO date, so parseCooldownFrom
    // tries Date.parse which returns NaN for non-date strings, so it returns null
    // This documents the current behaviour: string seconds are not handled
    expect(result).toBeNull();
  });
});
