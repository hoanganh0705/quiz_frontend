

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

describe('deletion-error-codes — string identity', () => {
it('AUTH_INVALID_CURRENT_PASSWORD matches the documented literal', () => {

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

describe('deletion-error-codes — DELETION_KNOWN_CODES registry', () => {
it('every known code is present in the array', () => {

expect(DELETION_KNOWN_CODES).toContain(AUTH_INVALID_CURRENT_PASSWORD);
expect(DELETION_KNOWN_CODES).toContain(AUTH_DELETION_FAILED);
expect(DELETION_KNOWN_CODES).toContain(AUTH_INVALID_TOKEN);
expect(DELETION_KNOWN_CODES).toContain(AUTH_RESOURCE_CONFLICT);
expect(DELETION_KNOWN_CODES).toContain(GLOBAL_VALIDATION_FAILED);
expect(DELETION_KNOWN_CODES).toContain(USER_NOT_FOUND);
  });

it('the array contains exactly the six documented codes', () => {

expect(DELETION_KNOWN_CODES.length).toBe(6);
  });

it('the array is frozen', () => {

expect(Object.isFrozen(DELETION_KNOWN_CODES)).toBe(true);
  });

it('exposes the documented union type for compile-time checks', () => {

const _lockstep: ReadonlyArray<DeletionErrorCode> = DELETION_KNOWN_CODES;
expect(_lockstep).toBe(DELETION_KNOWN_CODES);
  });
});

describe('deletion-error-codes — DELETION_RECOVERYABLE_STATUSES', () => {
it('contains 0 (network failure)', () => {
expect(DELETION_RECOVERYABLE_STATUSES).toContain(0);
  });

it('contains 429 (rate-limited)', () => {
expect(DELETION_RECOVERYABLE_STATUSES).toContain(429);
  });

it('contains every 5xx status the API may emit', () => {

const expected = [500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511];
for (const status of expected) {
expect(DELETION_RECOVERYABLE_STATUSES).toContain(status);
    }
  });

it('does NOT contain client-error 4xx statuses', () => {

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

expect(isInvalidCurrentPasswordError('AUTH_INVALID_CURRENT_PASSWOR')).toBe(false);
expect(isInvalidCurrentPasswordError('AUTH_INVALID_CURRENT_PASSWORD_LOWER')).toBe(false);
  });

it('narrowing: the predicate types the result as the literal', () => {
const code: string = AUTH_INVALID_CURRENT_PASSWORD;
if (isInvalidCurrentPasswordError(code)) {

expect(code).toBe(AUTH_INVALID_CURRENT_PASSWORD);
    } else {
throw new Error('expected narrowing to match');
    }
  });
});

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

expect(isDeletionErrorCode('auth_invalid_current_password')).toBe(false);
expect(isDeletionErrorCode('auth_deletion_failed')).toBe(false);
  });

it('narrowing: predicate types the result as DeletionErrorCode', () => {
const code: string = AUTH_DELETION_FAILED;
if (isDeletionErrorCode(code)) {

const allowed: ReadonlyArray<DeletionErrorCode> = DELETION_KNOWN_CODES;
expect(allowed).toContain(code);
    } else {
throw new Error('expected narrowing to match');
    }
  });
});

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

expect(isDeletionRecoverableStatus(509)).toBe(false);
  });

it('returns false for negative statuses (defensive)', () => {

expect(isDeletionRecoverableStatus(-1)).toBe(false);
  });
});
