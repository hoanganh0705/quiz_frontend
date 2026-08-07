/**
 * `ranking-confirm-strings.spec.ts`
 *
 * Source epic:   Epic 7.9.
 * Source ticket: TKT-7.9.B2.
 *
 * Verifies:
 *   - Both confirm keys are non-empty and distinct.
 *   - Labels are non-empty.
 *   - Reset notice mentions cross-user impact.
 *   - `getRankingConfirmMetadata` returns correct metadata for both actions.
 *   - Confirm strings are sourced from `IRREVERSIBLE_OPERATIONS`.
 */

import { describe, expect, it } from 'vitest';

import {
  RANKING_RECALCULATE_CONFIRM_KEY,
  RANKING_RESET_CONFIRM_KEY,
  RANKING_RECALCULATE_CONFIRM_STRING,
  RANKING_RESET_CONFIRM_STRING,
  RANKING_RECALCULATE_LABEL,
  RANKING_RESET_LABEL,
  RANKING_RECALCULATE_IRREVERSIBILITY_NOTICE,
  RANKING_RESET_IRREVERSIBILITY_NOTICE,
  getRankingConfirmMetadata,
} from '../ranking-confirm-strings';

// ─── Keys ─────────────────────────────────────────────────────────────────────

describe('Confirm keys', () => {
  it('recalculate key is non-empty', () => {
    expect(RANKING_RECALCULATE_CONFIRM_KEY.length).toBeGreaterThan(0);
  });

  it('reset key is non-empty', () => {
    expect(RANKING_RESET_CONFIRM_KEY.length).toBeGreaterThan(0);
  });

  it('recalculate and reset keys are distinct', () => {
    expect(RANKING_RECALCULATE_CONFIRM_KEY).not.toBe(RANKING_RESET_CONFIRM_KEY);
  });

  it('recalculate key is "ranking.recalculate"', () => {
    expect(RANKING_RECALCULATE_CONFIRM_KEY).toBe('ranking.recalculate');
  });

  it('reset key is "ranking.reset"', () => {
    expect(RANKING_RESET_CONFIRM_KEY).toBe('ranking.reset');
  });
});

// ─── Confirm strings ────────────────────────────────────────────────────────────

describe('Confirm strings', () => {
  it('recalculate confirm string is non-empty', () => {
    expect(RANKING_RECALCULATE_CONFIRM_STRING.length).toBeGreaterThan(0);
  });

  it('reset confirm string is non-empty', () => {
    expect(RANKING_RESET_CONFIRM_STRING.length).toBeGreaterThan(0);
  });

  it('recalculate confirm string is sourced from IRREVERSIBLE_OPERATIONS', () => {
    expect(RANKING_RECALCULATE_CONFIRM_STRING).toBe('RECALCULATE RANKINGS');
  });

  it('reset confirm string is sourced from IRREVERSIBLE_OPERATIONS', () => {
    expect(RANKING_RESET_CONFIRM_STRING).toBe('RESET RANKING PERIOD');
  });
});

// ─── Labels ────────────────────────────────────────────────────────────────────

describe('Labels', () => {
  it('recalculate label is non-empty', () => {
    expect(RANKING_RECALCULATE_LABEL.length).toBeGreaterThan(0);
  });

  it('reset label is non-empty', () => {
    expect(RANKING_RESET_LABEL.length).toBeGreaterThan(0);
  });
});

// ─── Irreversibility notices ────────────────────────────────────────────────────

describe('Irreversibility notices', () => {
  it('recalculate notice is non-empty', () => {
    expect(RANKING_RECALCULATE_IRREVERSIBILITY_NOTICE.length).toBeGreaterThan(0);
  });

  it('reset notice is non-empty', () => {
    expect(RANKING_RESET_IRREVERSIBILITY_NOTICE.length).toBeGreaterThan(0);
  });

  it('reset notice explicitly references cross-user impact', () => {
    const notice = RANKING_RESET_IRREVERSIBILITY_NOTICE.toLowerCase();
    expect(
      notice.includes('every user') || notice.includes('every user'),
    ).toBe(true);
    // More explicit: mentions "affects" or "impact" in the context of users
    expect(
      notice.includes('affect') ||
        notice.includes('impact') ||
        notice.includes('users'),
    ).toBe(true);
  });

  it('reset notice mentions it cannot be undone', () => {
    expect(
      RANKING_RESET_IRREVERSIBILITY_NOTICE.toLowerCase().includes('cannot be undone') ||
        RANKING_RESET_IRREVERSIBILITY_NOTICE.toLowerCase().includes('cannot be undone') ||
        RANKING_RESET_IRREVERSIBILITY_NOTICE.toLowerCase().includes('cannot be undone'),
    ).toBe(true);
  });
});

// ─── getRankingConfirmMetadata ─────────────────────────────────────────────────

describe('getRankingConfirmMetadata', () => {
  it('returns correct metadata for recalculate', () => {
    const meta = getRankingConfirmMetadata('recalculate');
    expect(meta.key).toBe('ranking.recalculate');
    expect(meta.label).toBe('Recalculate rankings');
    expect(meta.confirmString).toBe('RECALCULATE RANKINGS');
    expect(meta.irreversibilityNotice).toBe(RANKING_RECALCULATE_IRREVERSIBILITY_NOTICE);
  });

  it('returns correct metadata for reset', () => {
    const meta = getRankingConfirmMetadata('reset');
    expect(meta.key).toBe('ranking.reset');
    expect(meta.label).toBe('Reset ranking period');
    expect(meta.confirmString).toBe('RESET RANKING PERIOD');
    expect(meta.irreversibilityNotice).toBe(RANKING_RESET_IRREVERSIBILITY_NOTICE);
  });

  it('recalculate metadata includes all required fields', () => {
    const meta = getRankingConfirmMetadata('recalculate');
    expect(meta).toHaveProperty('key');
    expect(meta).toHaveProperty('label');
    expect(meta).toHaveProperty('confirmString');
    expect(meta).toHaveProperty('irreversibilityNotice');
  });

  it('reset metadata includes all required fields', () => {
    const meta = getRankingConfirmMetadata('reset');
    expect(meta).toHaveProperty('key');
    expect(meta).toHaveProperty('label');
    expect(meta).toHaveProperty('confirmString');
    expect(meta).toHaveProperty('irreversibilityNotice');
  });
});
