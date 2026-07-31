/**
 * Unit tests for `mapPasswordError`.
 *
 * Source epic: Epic 2.9 — Password re-verification and password change.
 * Source ticket: 2.9.T19.
 *
 * ## Coverage contract (per the ticket)
 *
 *   1. `AUTH_INVALID_CURRENT_PASSWORD` → `'invalid_current'`
 *   2. `AUTH_PASSWORD_REUSE` → `'reuse'`
 *   3. `GLOBAL_VALIDATION_FAILED` → `'validation'` (with `validationMessages` preserved)
 *   4. `AUTH_INVALID_TOKEN` → `'auth_terminal'`
 *   5. `AUTH_RESOURCE_CONFLICT` → `'conflict'`
 *   6. `429` / `5xx` / network (`status 0`) → `'retryable'`
 *   7. Unknown code → `'retryable'`
 *   8. 100% branch coverage
 *
 * ## Strategy
 *
 * The mapper is a pure function; we test it directly. No mocks, no
 * React rendering, no jsdom. The test file is fully deterministic
 * (no timers, no network).
 *
 * The branch-precedence tests at the bottom act as regression
 * guards: a code-driven branch (e.g. `AUTH_INVALID_TOKEN`) MUST win
 * over a status-driven branch (e.g. 500), and vice versa when
 * relevant.
 */

import { describe, expect, it } from 'vitest';
import {
  mapPasswordError,
  isInvalidCurrentPassword,
  isPasswordReuse,
  isPasswordValidation,
  isAuthTerminalPasswordError,
  isPasswordConflict,
  isPasswordErrorRetryable,
  type PasswordErrorInput,
} from '../password-error-mapper';
import {
  AUTH_INVALID_CURRENT_PASSWORD,
  AUTH_INVALID_TOKEN,
  AUTH_PASSWORD_REUSE,
  AUTH_RESOURCE_CONFLICT,
  GLOBAL_VALIDATION_FAILED,
  PASSWORD_RECOVERYABLE_STATUSES,
} from '../password-error-codes';

// ─── T19.1: AUTH_INVALID_CURRENT_PASSWORD ────────────────────────────────────

describe('mapPasswordError — AUTH_INVALID_CURRENT_PASSWORD', () => {
  it('classifies AUTH_INVALID_CURRENT_PASSWORD as "invalid_current"', () => {
    const result = mapPasswordError({
      code: AUTH_INVALID_CURRENT_PASSWORD,
      status: 401,
    });
    expect(result.kind).toBe('invalid_current');
    expect(result.code).toBe(AUTH_INVALID_CURRENT_PASSWORD);
    expect(result.status).toBe(401);
  });

  it('preserves the status on "invalid_current"', () => {
    // The status is forwarded even though `invalid_current` is a
    // code-driven branch — useful for logging.
    const result = mapPasswordError({
      code: AUTH_INVALID_CURRENT_PASSWORD,
      status: 401,
    });
    if (result.kind === 'invalid_current') {
      expect(result.status).toBe(401);
    }
  });
});

// ─── T19.2: AUTH_PASSWORD_REUSE ──────────────────────────────────────────────

describe('mapPasswordError — AUTH_PASSWORD_REUSE', () => {
  it('classifies AUTH_PASSWORD_REUSE as "reuse"', () => {
    const result = mapPasswordError({
      code: AUTH_PASSWORD_REUSE,
      status: 409,
    });
    expect(result.kind).toBe('reuse');
    expect(result.code).toBe(AUTH_PASSWORD_REUSE);
    expect(result.status).toBe(409);
  });
});

// ─── T19.3: GLOBAL_VALIDATION_FAILED ─────────────────────────────────────────

describe('mapPasswordError — GLOBAL_VALIDATION_FAILED', () => {
  it('classifies GLOBAL_VALIDATION_FAILED as "validation"', () => {
    const result = mapPasswordError({
      code: GLOBAL_VALIDATION_FAILED,
      status: 400,
    });
    expect(result.kind).toBe('validation');
    expect(result.code).toBe(GLOBAL_VALIDATION_FAILED);
    expect(result.status).toBe(400);
  });

  it('preserves validationMessages on "validation" branch', () => {
    const messages = [
      'password must be a non-empty string',
      'password must contain at least one uppercase letter',
    ];
    const result = mapPasswordError({
      code: GLOBAL_VALIDATION_FAILED,
      status: 400,
      validationMessages: messages,
    });
    if (result.kind === 'validation') {
      expect(result.validationMessages).toEqual(messages);
    } else {
      throw new Error('expected "validation" kind');
    }
  });

  it('defaults validationMessages to [] when not provided', () => {
    const result = mapPasswordError({
      code: GLOBAL_VALIDATION_FAILED,
      status: 400,
    });
    if (result.kind === 'validation') {
      expect(result.validationMessages).toEqual([]);
    } else {
      throw new Error('expected "validation" kind');
    }
  });
});

// ─── T19.4: AUTH_INVALID_TOKEN ───────────────────────────────────────────────

describe('mapPasswordError — AUTH_INVALID_TOKEN', () => {
  it('classifies AUTH_INVALID_TOKEN as "auth_terminal"', () => {
    const result = mapPasswordError({
      code: AUTH_INVALID_TOKEN,
      status: 401,
    });
    expect(result.kind).toBe('auth_terminal');
    expect(result.code).toBe(AUTH_INVALID_TOKEN);
    expect(result.status).toBe(401);
  });
});

// ─── T19.5: AUTH_RESOURCE_CONFLICT ───────────────────────────────────────────

describe('mapPasswordError — AUTH_RESOURCE_CONFLICT', () => {
  it('classifies AUTH_RESOURCE_CONFLICT (409) as "conflict"', () => {
    const result = mapPasswordError({
      code: AUTH_RESOURCE_CONFLICT,
      status: 409,
    });
    expect(result.kind).toBe('conflict');
    expect(result.code).toBe(AUTH_RESOURCE_CONFLICT);
    expect(result.status).toBe(409);
  });
});

// ─── T19.6: retryable (429 / 5xx / network) ──────────────────────────────────

describe('mapPasswordError — retryable status codes', () => {
  it.each(PASSWORD_RECOVERYABLE_STATUSES)(
    'classifies HTTP %s as "retryable"',
    (status) => {
      const result = mapPasswordError({
        code: 'SOME_CODE',
        status,
      });
      expect(result.kind).toBe('retryable');
      expect(result.status).toBe(status);
    },
  );

  it('preserves the original code on retryable', () => {
    const result = mapPasswordError({
      code: 'GLOBAL_INTERNAL_ERROR',
      status: 503,
    });
    expect(result.kind).toBe('retryable');
    expect(result.code).toBe('GLOBAL_INTERNAL_ERROR');
  });

  it('classifies rate-limited 429 as retryable', () => {
    const result = mapPasswordError({
      code: 'GLOBAL_RATE_LIMITED',
      status: 429,
    });
    expect(result.kind).toBe('retryable');
    expect(result.status).toBe(429);
  });

  it('classifies network failure (status 0) as retryable', () => {
    const result = mapPasswordError({
      code: 'NETWORK_FAILURE',
      status: 0,
    });
    expect(result.kind).toBe('retryable');
    expect(result.status).toBe(0);
  });
});

// ─── T19.7: unknown code → retryable fallback ────────────────────────────────

describe('mapPasswordError — unknown code (final fallback)', () => {
  it('classifies an unknown code with non-retryable status as "retryable"', () => {
    // Final fallback: bucketed to "retryable" for the user to
    // retry. The mapper never returns a different "unknown" kind.
    const result = mapPasswordError({
      code: 'SOMETHING_NEW',
      status: 418, // not retryable by status table
    });
    expect(result.kind).toBe('retryable');
    expect(result.code).toBe('SOMETHING_NEW');
    expect(result.status).toBe(418);
  });

  it('classifies an unknown code with status 200 as "retryable"', () => {
    const result = mapPasswordError({
      code: 'X',
      status: 200,
    });
    expect(result.kind).toBe('retryable');
  });

  it('classifies empty code + 401 as retryable (falls to status branch)', () => {
    // AUTH_INVALID_TOKEN wins on code match — but with empty code,
    // the status branch decides. 401 is NOT in PASSWORD_RECOVERYABLE_STATUSES
    // (only 0/429/5xx are), so it falls through to the final
    // retryable fallback.
    const result = mapPasswordError({
      code: '',
      status: 401,
    });
    expect(result.kind).toBe('retryable');
  });
});

// ─── T19.8: branch precedence (regression guards) ────────────────────────────

describe('mapPasswordError — branch precedence', () => {
  it('AUTH_INVALID_CURRENT_PASSWORD wins over retryable status', () => {
    // 503 is retryable by status, but the code-driven branch
    // (AUTH_INVALID_CURRENT_PASSWORD) takes precedence.
    const result = mapPasswordError({
      code: AUTH_INVALID_CURRENT_PASSWORD,
      status: 503,
    });
    expect(result.kind).toBe('invalid_current');
  });

  it('AUTH_PASSWORD_REUSE wins over retryable status', () => {
    const result = mapPasswordError({
      code: AUTH_PASSWORD_REUSE,
      status: 500,
    });
    expect(result.kind).toBe('reuse');
  });

  it('GLOBAL_VALIDATION_FAILED wins over retryable status', () => {
    const result = mapPasswordError({
      code: GLOBAL_VALIDATION_FAILED,
      status: 429,
    });
    expect(result.kind).toBe('validation');
  });

  it('AUTH_INVALID_TOKEN wins over retryable status', () => {
    const result = mapPasswordError({
      code: AUTH_INVALID_TOKEN,
      status: 500,
    });
    expect(result.kind).toBe('auth_terminal');
  });

  it('AUTH_RESOURCE_CONFLICT wins over retryable status', () => {
    const result = mapPasswordError({
      code: AUTH_RESOURCE_CONFLICT,
      status: 429,
    });
    expect(result.kind).toBe('conflict');
  });

  it('preserves the original status even when the kind is its own bucket', () => {
    const result = mapPasswordError({
      code: AUTH_INVALID_TOKEN,
      status: 401,
    });
    expect(result.kind).toBe('auth_terminal');
    expect(result.status).toBe(401);
  });

  it('preserves the original code in every classification', () => {
    const cases: PasswordErrorInput[] = [
      { code: AUTH_INVALID_CURRENT_PASSWORD, status: 401 },
      { code: AUTH_PASSWORD_REUSE, status: 409 },
      { code: GLOBAL_VALIDATION_FAILED, status: 400 },
      { code: AUTH_INVALID_TOKEN, status: 401 },
      { code: AUTH_RESOURCE_CONFLICT, status: 409 },
      { code: 'X', status: 500 },
      { code: 'Y', status: 0 },
    ];
    for (const input of cases) {
      const result = mapPasswordError(input);
      expect(result.code).toBe(input.code);
    }
  });
});

// ─── T19.9: type guards ──────────────────────────────────────────────────────

describe('mapPasswordError — type guards', () => {
  it('isInvalidCurrentPassword matches "invalid_current" classification', () => {
    const result = mapPasswordError({
      code: AUTH_INVALID_CURRENT_PASSWORD,
      status: 401,
    });
    expect(isInvalidCurrentPassword(result)).toBe(true);
    expect(isPasswordReuse(result)).toBe(false);
    expect(isPasswordValidation(result)).toBe(false);
    expect(isAuthTerminalPasswordError(result)).toBe(false);
    expect(isPasswordConflict(result)).toBe(false);
    expect(isPasswordErrorRetryable(result)).toBe(false);
  });

  it('isPasswordReuse matches "reuse" classification', () => {
    const result = mapPasswordError({
      code: AUTH_PASSWORD_REUSE,
      status: 409,
    });
    expect(isInvalidCurrentPassword(result)).toBe(false);
    expect(isPasswordReuse(result)).toBe(true);
    expect(isPasswordValidation(result)).toBe(false);
    expect(isAuthTerminalPasswordError(result)).toBe(false);
    expect(isPasswordConflict(result)).toBe(false);
    expect(isPasswordErrorRetryable(result)).toBe(false);
  });

  it('isPasswordValidation matches "validation" classification', () => {
    const result = mapPasswordError({
      code: GLOBAL_VALIDATION_FAILED,
      status: 400,
      validationMessages: ['bad password'],
    });
    expect(isInvalidCurrentPassword(result)).toBe(false);
    expect(isPasswordReuse(result)).toBe(false);
    expect(isPasswordValidation(result)).toBe(true);
    expect(isAuthTerminalPasswordError(result)).toBe(false);
    expect(isPasswordConflict(result)).toBe(false);
    expect(isPasswordErrorRetryable(result)).toBe(false);
  });

  it('isAuthTerminalPasswordError matches "auth_terminal" classification', () => {
    const result = mapPasswordError({
      code: AUTH_INVALID_TOKEN,
      status: 401,
    });
    expect(isInvalidCurrentPassword(result)).toBe(false);
    expect(isPasswordReuse(result)).toBe(false);
    expect(isPasswordValidation(result)).toBe(false);
    expect(isAuthTerminalPasswordError(result)).toBe(true);
    expect(isPasswordConflict(result)).toBe(false);
    expect(isPasswordErrorRetryable(result)).toBe(false);
  });

  it('isPasswordConflict matches "conflict" classification', () => {
    const result = mapPasswordError({
      code: AUTH_RESOURCE_CONFLICT,
      status: 409,
    });
    expect(isInvalidCurrentPassword(result)).toBe(false);
    expect(isPasswordReuse(result)).toBe(false);
    expect(isPasswordValidation(result)).toBe(false);
    expect(isAuthTerminalPasswordError(result)).toBe(false);
    expect(isPasswordConflict(result)).toBe(true);
    expect(isPasswordErrorRetryable(result)).toBe(false);
  });

  it('isPasswordErrorRetryable matches "retryable" classification', () => {
    const result = mapPasswordError({
      code: 'X',
      status: 500,
    });
    expect(isInvalidCurrentPassword(result)).toBe(false);
    expect(isPasswordReuse(result)).toBe(false);
    expect(isPasswordValidation(result)).toBe(false);
    expect(isAuthTerminalPasswordError(result)).toBe(false);
    expect(isPasswordConflict(result)).toBe(false);
    expect(isPasswordErrorRetryable(result)).toBe(true);
  });
});

// ─── T19.10: validation round-trip ───────────────────────────────────────────

describe('mapPasswordError — validation round-trip', () => {
  it('preserves arbitrary validation messages through the mapper', () => {
    const messages = [
      'password must be at least 8 characters',
      'password must contain at least one number',
      'password must contain at least one special character',
    ];
    const result = mapPasswordError({
      code: GLOBAL_VALIDATION_FAILED,
      status: 400,
      validationMessages: messages,
    });
    if (result.kind !== 'validation') {
      throw new Error('expected validation kind');
    }
    expect(result.validationMessages).toEqual(messages);
    expect(result.validationMessages.length).toBe(messages.length);
  });

  it('returns an empty array when validationMessages is an empty array', () => {
    const result = mapPasswordError({
      code: GLOBAL_VALIDATION_FAILED,
      status: 400,
      validationMessages: [],
    });
    if (result.kind !== 'validation') {
      throw new Error('expected validation kind');
    }
    expect(result.validationMessages).toEqual([]);
  });
});
