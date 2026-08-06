import { describe, expect, it } from 'vitest';

import {
  assertIrreversibleInvariantsHold,
  findBrokenIrreversibleInvariants,
  findDuplicateIrreversibleConfirmStrings,
  IRREVERSIBLE_CONFIRM_DOCUMENTATION,
  IRREVERSIBLE_CONFIRM_MIN_LENGTH,
  IRREVERSIBLE_INVARIANTS,
  isFullyValidConfirm,
  validateIrreversibleConfirm,
} from '../irreversible-confirm-invariants';

describe('admin/irreversible-confirm-invariants — TKT-7.1.A5', () => {
  it('(1) IRREVERSIBLE_CONFIRM_MIN_LENGTH is at least 8', () => {
    expect(IRREVERSIBLE_CONFIRM_MIN_LENGTH).toBeGreaterThanOrEqual(8);
  });

  it('(2) catalogue documents case-sensitivity and whitespace-sensitivity', () => {
    expect(IRREVERSIBLE_CONFIRM_DOCUMENTATION.caseSensitive).toBe(true);
    expect(IRREVERSIBLE_CONFIRM_DOCUMENTATION.whitespaceSensitive).toBe(true);
    expect(IRREVERSIBLE_CONFIRM_DOCUMENTATION.backendCode).toBe(
      'IRREVERSIBLE_CONFIRM_REQUIRED',
    );
  });

  it('(3) validateIrreversibleConfirm rejects trivial strings', () => {
    expect(validateIrreversibleConfirm('YES', 'minLength')).toBe(false);
    expect(validateIrreversibleConfirm('RESET', 'nonTrivial')).toBe(false);
    expect(validateIrreversibleConfirm('lowercase', 'caseSensitive')).toBe(false);
    expect(validateIrreversibleConfirm('NOSPACESE', 'whitespaceSensitive')).toBe(false);
  });

  it('(4) isFullyValidConfirm returns true only for properly-cased multi-word strings', () => {
    expect(isFullyValidConfirm('RESET RANKING PERIOD')).toBe(true);
    expect(isFullyValidConfirm('INVALID CONFIRM')).toBe(true);
    expect(isFullyValidConfirm('yes')).toBe(false);
    expect(isFullyValidConfirm('OK')).toBe(false);
  });

  it('(5) findBrokenIrreversibleInvariants returns no broken operations', () => {
    expect(findBrokenIrreversibleInvariants()).toEqual([]);
  });

  it('(6) findDuplicateIrreversibleConfirmStrings returns no duplicates', () => {
    expect(findDuplicateIrreversibleConfirmStrings()).toEqual([]);
  });

  it('(7) IRREVERSIBLE_INVARIANTS exposes exactly the four documented checks', () => {
    expect(Object.keys(IRREVERSIBLE_INVARIANTS).sort()).toEqual([
      'caseSensitive',
      'minLength',
      'nonTrivial',
      'whitespaceSensitive',
    ]);
  });

  it('(8) assertIrreversibleInvariantsHold does not throw at module init', () => {
    expect(() => assertIrreversibleInvariantsHold()).not.toThrow();
  });
});
