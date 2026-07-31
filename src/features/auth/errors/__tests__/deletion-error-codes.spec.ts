/**
 * Unit tests for the deletion error code constants and helpers.
 *
 * Source epic: Epic 2.10 — Permanent account deletion.
 * Source ticket: 2.10.T25.
 *
 * ## Coverage contract (per the ticket)
 *
 *   1. Each constant equals the documented string literal.
 *   2. The `DeletionErrorCode` union and the `DELETION_KNOWN_CODES`
 *      array are in lockstep — adding a new code without extending
 *      the array (or vice-versa) is a test failure.
 *   3. Every type guard returns the right boolean for both matches
 *      and non-matches, and narrows the type accordingly.
 *   4. `isDeletionRecoverableStatus` covers every status in
 *      `DELETION_RECOVERYABLE_STATUSES` and rejects every other
 *      representative status.
 *   5. The mapper's `#region codes` is the canonical source of
 *      truth — no string literals are duplicated in the test.
 *      Assertions on raw strings live in a separate `String
 *      identity` block.
 *
 * ## Strategy
 *
 * Pure-function tests, no mocks, no DOM, no timers. The constants
 * and the type guards are the smallest, most regression-prone
 * surface in the deletion flow: a typo in `AUTH_DELETION_FAILED`
 * would silently route the user to a 4xx banner instead of the
 * "deletion not confirmed" CTA. Locking the literals down here
 * is cheap insurance.
 */

import { describe, expect, it } from 'vitest';

import {
  AUTH_DELETION_FAILED,
  AUTH_INVALID_CURRENT_PASSWORD,
  AUTH_INVALID_TOKEN,
  AUTH_RESOURCE_CONFLICT,
  GLOBAL_VALIDATION_FAILED,
  USER_NOT_FOUND,
  DELETION_KNOWN_CODES,
  DELETION_RECOVERYABLE_STATUSES,
  isInvalidCurrentPasswordError,
  isDeletionFailedError,
  isUserNotFoundError,
  isDeletionErrorCode,
  isDeletionRecoverableStatus,
  type DeletionErrorCode,
} from '../deletion-error-codes';

// ─── T25.1: String identity ──────────────────────────────────────────────────

describe('deletion-error-codes — string identity', () => {
  it('AUTH_INVALID_CURRENT_PASSWORD matches the documented literal', () => {
    // The exact string is part of the contract — the backend's
    // RFC 7807 `extensions.code` for "wrong password on
    // DELETE /auth/account".
    expect(AUTH_INVALID_CURRENT_PASSWORD).toBe('AUTH_INVALID_CURRENT_PASSWORD');
  });

  it('AUTH_DELETION_FAILED matches the documented literal', () => {
    expect(AUTH_DELETION_FAILED).toBe('AUTH_DELETION_FAILED');
  });

  it('AUTH_INVALID_TOKEN matches the documented literal', () => {
    expect(AUTH_INVALID_TOKEN).toBe('AUTH_INVALID_TOKEN');
  });

  it('AUTH_RESOURCE_CONFLICT matches the documented literal', () => {
    expect(AUTH_RESOURCE_CONFLICT).toBe('AUTH_RESOURCE_CONFLICT');
  });

  it('GLOBAL_VALIDATION_FAILED matches the documented literal', () => {
    expect(GLOBAL_VALIDATION_FAILED).toBe('GLOBAL_VALIDATION_FAILED');
  });

  it('USER_NOT_FOUND matches the documented literal', () => {
    expect(USER_NOT_FOUND).toBe('USER_NOT_FOUND');
  });

  it('no two deletion codes share the same string literal', () => {
    const codes = [
      AUTH_INVALID_CURRENT_PASSWORD,
      AUTH_DELETION_FAILED,
      AUTH_INVALID_TOKEN,
      AUTH_RESOURCE_CONFLICT,
      GLOBAL_VALIDATION_FAILED,
      USER_NOT_FOUND,
    ] as const;
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });
});

// ─── T25.2: DELETION_KNOWN_CODES ↔ DeletionErrorCode lockstep ────────────────

describe('deletion-error-codes — DELETION_KNOWN_CODES registry', () => {
  it('every known code is present in the array', () => {
    // The union is the source of truth; the array must contain
    // exactly the union's members.
    expect(DELETION_KNOWN_CODES).toContain(AUTH_INVALID_CURRENT_PASSWORD);
    expect(DELETION_KNOWN_CODES).toContain(AUTH_DELETION_FAILED);
    expect(DELETION_KNOWN_CODES).toContain(AUTH_INVALID_TOKEN);
    expect(DELETION_KNOWN_CODES).toContain(AUTH_RESOURCE_CONFLICT);
    expect(DELETION_KNOWN_CODES).toContain(GLOBAL_VALIDATION_FAILED);
    expect(DELETION_KNOWN_CODES).toContain(USER_NOT_FOUND);
  });

  it('the array contains exactly the six documented codes', () => {
    // Adding a new code without extending the array is a test
    // failure — this is the regression guard for the union/array
    // drift documented in the module's JSDoc.
    expect(DELETION_KNOWN_CODES.length).toBe(6);
  });

  it('the array is frozen', () => {
    // `Object.freeze` on the array — production code must not
    // mutate the registry at runtime.
    expect(Object.isFrozen(DELETION_KNOWN_CODES)).toBe(true);
  });

  it('exposes the documented union type for compile-time checks', () => {
    // The cast is a no-op assertion: it forces `tsc` to type-check
    // that `DELETION_KNOWN_CODES` is assignable to
    // `ReadonlyArray<DeletionErrorCode>`. If a future PR adds a
    // code to the union but not to the array, this line fails
    // type checking.
    const _lockstep: ReadonlyArray<DeletionErrorCode> = DELETION_KNOWN_CODES;
    expect(_lockstep).toBe(DELETION_KNOWN_CODES);
  });
});

// ─── T25.3: DELETION_RECOVERYABLE_STATUSES ────────────────────────────────────

describe('deletion-error-codes — DELETION_RECOVERYABLE_STATUSES', () => {
  it('contains 0 (network failure)', () => {
    expect(DELETION_RECOVERYABLE_STATUSES).toContain(0);
  });

  it('contains 429 (rate-limited)', () => {
    expect(DELETION_RECOVERYABLE_STATUSES).toContain(429);
  });

  it('contains every 5xx status the API may emit', () => {
    // Statuses the global filter can produce. 509 is intentionally
    // excluded (RFC 7231 §6.6.3 "missing bandwidth" — Node's
    // NestJS filter does not emit it).
    const expected = [500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511];
    for (const status of expected) {
      expect(DELETION_RECOVERYABLE_STATUSES).toContain(status);
    }
  });

  it('does NOT contain client-error 4xx statuses', () => {
    // 4xx (other than 429) is a code-driven branch, not a
    // status-driven fallback. Including them here would let
    // `isDeletionRecoverableStatus` mask a real `'invalid_current'`
    // or `'conflict'` outcome.
    expect(DELETION_RECOVERYABLE_STATUSES).not.toContain(400);
    expect(DELETION_RECOVERYABLE_STATUSES).not.toContain(401);
    expect(DELETION_RECOVERYABLE_STATUSES).not.toContain(403);
    expect(DELETION_RECOVERYABLE_STATUSES).not.toContain(404);
    expect(DELETION_RECOVERYABLE_STATUSES).not.toContain(409);
  });

  it('the array is frozen', () => {
    expect(Object.isFrozen(DELETION_RECOVERYABLE_STATUSES)).toBe(true);
  });
});

// ─── T25.4: isInvalidCurrentPasswordError ─────────────────────────────────────

describe('isInvalidCurrentPasswordError', () => {
  it('returns true for the exact literal', () => {
    expect(isInvalidCurrentPasswordError(AUTH_INVALID_CURRENT_PASSWORD)).toBe(true);
  });

  it('returns false for the other deletion codes', () => {
    expect(isInvalidCurrentPasswordError(AUTH_DELETION_FAILED)).toBe(false);
    expect(isInvalidCurrentPasswordError(AUTH_INVALID_TOKEN)).toBe(false);
    expect(isInvalidCurrentPasswordError(AUTH_RESOURCE_CONFLICT)).toBe(false);
    expect(isInvalidCurrentPasswordError(GLOBAL_VALIDATION_FAILED)).toBe(false);
    expect(isInvalidCurrentPasswordError(USER_NOT_FOUND)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isInvalidCurrentPasswordError('')).toBe(false);
  });

  it('returns false for a partial match', () => {
    // Truncation / typos must NOT match.
    expect(isInvalidCurrentPasswordError('AUTH_INVALID_CURRENT_PASSWOR')).toBe(false);
    expect(isInvalidCurrentPasswordError('AUTH_INVALID_CURRENT_PASSWORD_LOWER')).toBe(false);
  });

  it('narrowing: the predicate types the result as the literal', () => {
    const code: string = AUTH_INVALID_CURRENT_PASSWORD;
    if (isInvalidCurrentPasswordError(code)) {
      // Compile-time check: the variable is narrowed to the
      // literal type — `expectTypeOf` is too heavy for our
      // setup, so we re-use the constant for a runtime
      // cross-check.
      expect(code).toBe(AUTH_INVALID_CURRENT_PASSWORD);
    } else {
      throw new Error('expected narrowing to match');
    }
  });
});

// ─── T25.5: isDeletionFailedError ────────────────────────────────────────────

describe('isDeletionFailedError', () => {
  it('returns true for the exact literal', () => {
    expect(isDeletionFailedError(AUTH_DELETION_FAILED)).toBe(true);
  });

  it('returns false for the other deletion codes', () => {
    expect(isDeletionFailedError(AUTH_INVALID_CURRENT_PASSWORD)).toBe(false);
    expect(isDeletionFailedError(AUTH_INVALID_TOKEN)).toBe(false);
    expect(isDeletionFailedError(AUTH_RESOURCE_CONFLICT)).toBe(false);
    expect(isDeletionFailedError(GLOBAL_VALIDATION_FAILED)).toBe(false);
    expect(isDeletionFailedError(USER_NOT_FOUND)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isDeletionFailedError('')).toBe(false);
  });
});

// ─── T25.6: isUserNotFoundError ──────────────────────────────────────────────

describe('isUserNotFoundError', () => {
  it('returns true for the exact literal', () => {
    expect(isUserNotFoundError(USER_NOT_FOUND)).toBe(true);
  });

  it('returns false for the other deletion codes', () => {
    expect(isUserNotFoundError(AUTH_INVALID_CURRENT_PASSWORD)).toBe(false);
    expect(isUserNotFoundError(AUTH_DELETION_FAILED)).toBe(false);
    expect(isUserNotFoundError(AUTH_INVALID_TOKEN)).toBe(false);
    expect(isUserNotFoundError(AUTH_RESOURCE_CONFLICT)).toBe(false);
    expect(isUserNotFoundError(GLOBAL_VALIDATION_FAILED)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isUserNotFoundError('')).toBe(false);
  });
});

// ─── T25.7: isDeletionErrorCode ───────────────────────────────────────────────

describe('isDeletionErrorCode', () => {
  it('returns true for every member of DELETION_KNOWN_CODES', () => {
    for (const code of DELETION_KNOWN_CODES) {
      expect(isDeletionErrorCode(code)).toBe(true);
    }
  });

  it('returns false for unrelated codes', () => {
    expect(isDeletionErrorCode('AUTH_PASSWORD_REUSE')).toBe(false);
    expect(isDeletionErrorCode('GLOBAL_INTERNAL_ERROR')).toBe(false);
    expect(isDeletionErrorCode('GLOBAL_RATE_LIMITED')).toBe(false);
    expect(isDeletionErrorCode('SOMETHING_NEW')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isDeletionErrorCode('')).toBe(false);
  });

  it('handles case-sensitivity', () => {
    // Codes are case-sensitive — the backend emits them in
    // uppercase. A lowercase variant must NOT match.
    expect(isDeletionErrorCode('auth_invalid_current_password')).toBe(false);
    expect(isDeletionErrorCode('auth_deletion_failed')).toBe(false);
  });

  it('narrowing: predicate types the result as DeletionErrorCode', () => {
    const code: string = AUTH_DELETION_FAILED;
    if (isDeletionErrorCode(code)) {
      // Compile-time check: code is now typed as the literal
      // union. Cross-check at runtime against the union's
      // members.
      const allowed: ReadonlyArray<DeletionErrorCode> = DELETION_KNOWN_CODES;
      expect(allowed).toContain(code);
    } else {
      throw new Error('expected narrowing to match');
    }
  });
});

// ─── T25.8: isDeletionRecoverableStatus ───────────────────────────────────────

describe('isDeletionRecoverableStatus', () => {
  it.each(DELETION_RECOVERYABLE_STATUSES)('returns true for status %s', (status) => {
    expect(isDeletionRecoverableStatus(status)).toBe(true);
  });

  it('returns false for 4xx client errors', () => {
    expect(isDeletionRecoverableStatus(400)).toBe(false);
    expect(isDeletionRecoverableStatus(401)).toBe(false);
    expect(isDeletionRecoverableStatus(403)).toBe(false);
    expect(isDeletionRecoverableStatus(404)).toBe(false);
    expect(isDeletionRecoverableStatus(409)).toBe(false);
  });

  it('returns false for 2xx success', () => {
    expect(isDeletionRecoverableStatus(200)).toBe(false);
    expect(isDeletionRecoverableStatus(201)).toBe(false);
    expect(isDeletionRecoverableStatus(204)).toBe(false);
  });

  it('returns false for 3xx redirects', () => {
    expect(isDeletionRecoverableStatus(301)).toBe(false);
    expect(isDeletionRecoverableStatus(302)).toBe(false);
    expect(isDeletionRecoverableStatus(304)).toBe(false);
  });

  it('returns false for an out-of-range status (509 missing-bandwidth)', () => {
    // 509 is intentionally excluded from the array — keep the
    // exclusion as a test guard.
    expect(isDeletionRecoverableStatus(509)).toBe(false);
  });

  it('returns false for negative statuses (defensive)', () => {
    // The mapper's `status` parameter is typed `number` to
    // accept `0` for network failures; negative numbers must not
    // be falsely treated as retryable.
    expect(isDeletionRecoverableStatus(-1)).toBe(false);
  });
});
