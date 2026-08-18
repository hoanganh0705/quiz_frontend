

import { describe, expect, it } from 'vitest';

import {
mapDeletionError,
isInvalidCurrentPasswordDeletion,
isDeletionConflict,
isDeletionNotFound,
isAuthTerminalDeletionError,
isDeletionValidation,
isDeletionUncertain,
type DeletionErrorInput,
} from '../deletion-error-mapper';
import {
AUTH_DELETION_FAILED,
AUTH_INVALID_CURRENT_PASSWORD,
AUTH_INVALID_TOKEN,
AUTH_RESOURCE_CONFLICT,
GLOBAL_VALIDATION_FAILED,
USER_NOT_FOUND,
DELETION_RECOVERYABLE_STATUSES,
} from '../deletion-error-codes';

describe('mapDeletionError — AUTH_INVALID_CURRENT_PASSWORD', () => {
it('classifies AUTH_INVALID_CURRENT_PASSWORD as "invalid_current"', () => {
const result = mapDeletionError({
code: AUTH_INVALID_CURRENT_PASSWORD,
status: 401,
    });
expect(result.kind).toBe('invalid_current');
expect(result.code).toBe(AUTH_INVALID_CURRENT_PASSWORD);
expect(result.status).toBe(401);
  });

it('preserves status even when the code is the discriminator', () => {

const result = mapDeletionError({
code: AUTH_INVALID_CURRENT_PASSWORD,
status: 401,
    });
if (result.kind === 'invalid_current') {
expect(result.status).toBe(401);
    } else {
throw new Error('expected "invalid_current" kind');
    }
  });

it('does NOT classify as "conflict" — the two branches must remain distinct', () => {

const result = mapDeletionError({
code: AUTH_INVALID_CURRENT_PASSWORD,
status: 409,
    });
expect(result.kind).toBe('invalid_current');
expect(result.kind).not.toBe('conflict');
  });
});

describe('mapDeletionError — AUTH_DELETION_FAILED', () => {
it('classifies AUTH_DELETION_FAILED as "conflict"', () => {
const result = mapDeletionError({
code: AUTH_DELETION_FAILED,
status: 409,
    });
expect(result.kind).toBe('conflict');
expect(result.code).toBe(AUTH_DELETION_FAILED);
expect(result.status).toBe(409);
  });

it('preserves status on the conflict branch', () => {
const result = mapDeletionError({
code: AUTH_DELETION_FAILED,
status: 409,
    });
if (result.kind === 'conflict') {
expect(result.status).toBe(409);
    } else {
throw new Error('expected "conflict" kind');
    }
  });
});

describe('mapDeletionError — USER_NOT_FOUND', () => {
it('classifies USER_NOT_FOUND as "not_found"', () => {
const result = mapDeletionError({
code: USER_NOT_FOUND,
status: 404,
    });
expect(result.kind).toBe('not_found');
expect(result.code).toBe(USER_NOT_FOUND);
expect(result.status).toBe(404);
  });

it('preserves status on "not_found"', () => {
const result = mapDeletionError({
code: USER_NOT_FOUND,
status: 404,
    });
if (result.kind === 'not_found') {
expect(result.status).toBe(404);
    } else {
throw new Error('expected "not_found" kind');
    }
  });
});

describe('mapDeletionError — AUTH_INVALID_TOKEN', () => {
it('classifies AUTH_INVALID_TOKEN as "auth_terminal"', () => {
const result = mapDeletionError({
code: AUTH_INVALID_TOKEN,
status: 401,
    });
expect(result.kind).toBe('auth_terminal');
expect(result.code).toBe(AUTH_INVALID_TOKEN);
expect(result.status).toBe(401);
  });

it('AUTH_INVALID_TOKEN wins over retryable status', () => {

const result = mapDeletionError({
code: AUTH_INVALID_TOKEN,
status: 503,
    });
expect(result.kind).toBe('auth_terminal');
  });
});

describe('mapDeletionError — AUTH_RESOURCE_CONFLICT', () => {
it('classifies AUTH_RESOURCE_CONFLICT as "conflict"', () => {
const result = mapDeletionError({
code: AUTH_RESOURCE_CONFLICT,
status: 409,
    });
expect(result.kind).toBe('conflict');
expect(result.code).toBe(AUTH_RESOURCE_CONFLICT);
expect(result.status).toBe(409);
  });
});

describe('mapDeletionError — GLOBAL_VALIDATION_FAILED', () => {
it('classifies GLOBAL_VALIDATION_FAILED as "validation"', () => {
const result = mapDeletionError({
code: GLOBAL_VALIDATION_FAILED,
status: 400,
    });
expect(result.kind).toBe('validation');
expect(result.code).toBe(GLOBAL_VALIDATION_FAILED);
expect(result.status).toBe(400);
  });

it('preserves validationMessages on the "validation" branch', () => {
const messages = [
'password must be a non-empty string',
'password must contain at least one uppercase letter',
    ];
const result = mapDeletionError({
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
const result = mapDeletionError({
code: GLOBAL_VALIDATION_FAILED,
status: 400,
    });
if (result.kind === 'validation') {
expect(result.validationMessages).toEqual([]);
    } else {
throw new Error('expected "validation" kind');
    }
  });

it('preserves validationMessages=[] explicitly', () => {

const result = mapDeletionError({
code: GLOBAL_VALIDATION_FAILED,
status: 400,
validationMessages: [],
    });
if (result.kind === 'validation') {
expect(result.validationMessages).toEqual([]);
    } else {
throw new Error('expected "validation" kind');
    }
  });
});

describe('mapDeletionError — retryable / uncertain status codes', () => {
it.each(DELETION_RECOVERYABLE_STATUSES)(
'classifies HTTP %s with unknown code as "uncertain"',
(status) => {
const result = mapDeletionError({
code: 'SOME_CODE',
status,
      });
expect(result.kind).toBe('uncertain');
expect(result.status).toBe(status);
    },
  );

it('preserves the original code on "uncertain"', () => {

const result = mapDeletionError({
code: 'GLOBAL_INTERNAL_ERROR',
status: 503,
    });
expect(result.kind).toBe('uncertain');
expect(result.code).toBe('GLOBAL_INTERNAL_ERROR');
  });

it('classifies network failure (status 0) as uncertain', () => {
const result = mapDeletionError({
code: 'NETWORK_FAILURE',
status: 0,
    });
expect(result.kind).toBe('uncertain');
expect(result.status).toBe(0);
  });

it('classifies 429 as uncertain (rate-limited)', () => {
const result = mapDeletionError({
code: 'GLOBAL_RATE_LIMITED',
status: 429,
    });
expect(result.kind).toBe('uncertain');
expect(result.status).toBe(429);
  });

it('does NOT classify 4xx as "uncertain" via status fallback', () => {

const result = mapDeletionError({
code: 'SOMETHING_NEW',
status: 401,
    });
expect(result.kind).toBe('uncertain');
expect(result.kind).not.toBe('auth_terminal');
  });
});

describe('mapDeletionError — unknown code (final fallback)', () => {
it('classifies an unknown code with non-retryable status as "uncertain"', () => {

const result = mapDeletionError({
code: 'SOMETHING_NEW',
status: 418,
    });
expect(result.kind).toBe('uncertain');
expect(result.code).toBe('SOMETHING_NEW');
expect(result.status).toBe(418);
  });

it('classifies an unknown code with status 200 as "uncertain"', () => {

const result = mapDeletionError({
code: 'X',
status: 200,
    });
expect(result.kind).toBe('uncertain');
  });

it('classifies empty code + 401 as "uncertain" (status fallback)', () => {

const result = mapDeletionError({
code: '',
status: 401,
    });
expect(result.kind).toBe('uncertain');
  });
});

describe('mapDeletionError — branch precedence', () => {
it('AUTH_INVALID_CURRENT_PASSWORD wins over retryable status', () => {

const result = mapDeletionError({
code: AUTH_INVALID_CURRENT_PASSWORD,
status: 503,
    });
expect(result.kind).toBe('invalid_current');
  });

it('AUTH_DELETION_FAILED wins over retryable status', () => {
const result = mapDeletionError({
code: AUTH_DELETION_FAILED,
status: 500,
    });
expect(result.kind).toBe('conflict');
  });

it('AUTH_INVALID_TOKEN wins over retryable status', () => {
const result = mapDeletionError({
code: AUTH_INVALID_TOKEN,
status: 502,
    });
expect(result.kind).toBe('auth_terminal');
  });

it('USER_NOT_FOUND does NOT collapse into "conflict"', () => {

const result = mapDeletionError({
code: USER_NOT_FOUND,
status: 409,
    });
expect(result.kind).toBe('not_found');
expect(result.kind).not.toBe('conflict');
  });

it('AUTH_INVALID_TOKEN does NOT collapse into "uncertain"', () => {

const result = mapDeletionError({
code: AUTH_INVALID_TOKEN,
status: 401,
    });
expect(result.kind).toBe('auth_terminal');
expect(result.kind).not.toBe('uncertain');
  });

it('GLOBAL_VALIDATION_FAILED wins over retryable status', () => {
const result = mapDeletionError({
code: GLOBAL_VALIDATION_FAILED,
status: 500,
    });
expect(result.kind).toBe('validation');
  });

it('AUTH_RESOURCE_CONFLICT wins over retryable status', () => {

const result = mapDeletionError({
code: AUTH_RESOURCE_CONFLICT,
status: 503,
    });
expect(result.kind).toBe('conflict');
  });
});

describe('isInvalidCurrentPasswordDeletion', () => {
it('returns true for "invalid_current"', () => {
const c = mapDeletionError({ code: AUTH_INVALID_CURRENT_PASSWORD, status: 401 });
expect(isInvalidCurrentPasswordDeletion(c)).toBe(true);
  });

it('returns false for other kinds', () => {
const samples: DeletionErrorInput[] = [
{ code: AUTH_DELETION_FAILED, status: 409 },
{ code: AUTH_INVALID_TOKEN, status: 401 },
{ code: AUTH_RESOURCE_CONFLICT, status: 409 },
{ code: GLOBAL_VALIDATION_FAILED, status: 400 },
{ code: USER_NOT_FOUND, status: 404 },
{ code: 'SOMETHING_NEW', status: 503 },
    ];
for (const input of samples) {
const c = mapDeletionError(input);
expect(isInvalidCurrentPasswordDeletion(c)).toBe(false);
    }
  });
});

describe('isDeletionConflict', () => {
it('returns true for AUTH_DELETION_FAILED', () => {
const c = mapDeletionError({ code: AUTH_DELETION_FAILED, status: 409 });
expect(isDeletionConflict(c)).toBe(true);
  });

it('returns true for AUTH_RESOURCE_CONFLICT', () => {
const c = mapDeletionError({ code: AUTH_RESOURCE_CONFLICT, status: 409 });
expect(isDeletionConflict(c)).toBe(true);
  });

it('returns false for non-conflict kinds', () => {
const samples: DeletionErrorInput[] = [
{ code: AUTH_INVALID_CURRENT_PASSWORD, status: 401 },
{ code: AUTH_INVALID_TOKEN, status: 401 },
{ code: GLOBAL_VALIDATION_FAILED, status: 400 },
{ code: USER_NOT_FOUND, status: 404 },
{ code: 'SOMETHING_NEW', status: 503 },
    ];
for (const input of samples) {
const c = mapDeletionError(input);
expect(isDeletionConflict(c)).toBe(false);
    }
  });
});

describe('isDeletionNotFound', () => {
it('returns true for USER_NOT_FOUND', () => {
const c = mapDeletionError({ code: USER_NOT_FOUND, status: 404 });
expect(isDeletionNotFound(c)).toBe(true);
  });

it('returns false for non-not-found kinds', () => {
const samples: DeletionErrorInput[] = [
{ code: AUTH_INVALID_CURRENT_PASSWORD, status: 401 },
{ code: AUTH_DELETION_FAILED, status: 409 },
{ code: AUTH_INVALID_TOKEN, status: 401 },
{ code: AUTH_RESOURCE_CONFLICT, status: 409 },
{ code: GLOBAL_VALIDATION_FAILED, status: 400 },
{ code: 'SOMETHING_NEW', status: 503 },
    ];
for (const input of samples) {
const c = mapDeletionError(input);
expect(isDeletionNotFound(c)).toBe(false);
    }
  });
});

describe('isAuthTerminalDeletionError', () => {
it('returns true for AUTH_INVALID_TOKEN', () => {
const c = mapDeletionError({ code: AUTH_INVALID_TOKEN, status: 401 });
expect(isAuthTerminalDeletionError(c)).toBe(true);
  });

it('returns false for non-auth-terminal kinds', () => {
const samples: DeletionErrorInput[] = [
{ code: AUTH_INVALID_CURRENT_PASSWORD, status: 401 },
{ code: AUTH_DELETION_FAILED, status: 409 },
{ code: AUTH_RESOURCE_CONFLICT, status: 409 },
{ code: GLOBAL_VALIDATION_FAILED, status: 400 },
{ code: USER_NOT_FOUND, status: 404 },
{ code: 'SOMETHING_NEW', status: 503 },
    ];
for (const input of samples) {
const c = mapDeletionError(input);
expect(isAuthTerminalDeletionError(c)).toBe(false);
    }
  });
});

describe('isDeletionValidation', () => {
it('returns true for GLOBAL_VALIDATION_FAILED', () => {
const c = mapDeletionError({ code: GLOBAL_VALIDATION_FAILED, status: 400 });
expect(isDeletionValidation(c)).toBe(true);
  });

it('returns false for non-validation kinds', () => {
const samples: DeletionErrorInput[] = [
{ code: AUTH_INVALID_CURRENT_PASSWORD, status: 401 },
{ code: AUTH_DELETION_FAILED, status: 409 },
{ code: AUTH_INVALID_TOKEN, status: 401 },
{ code: AUTH_RESOURCE_CONFLICT, status: 409 },
{ code: USER_NOT_FOUND, status: 404 },
{ code: 'SOMETHING_NEW', status: 503 },
    ];
for (const input of samples) {
const c = mapDeletionError(input);
expect(isDeletionValidation(c)).toBe(false);
    }
  });
});

describe('isDeletionUncertain', () => {
it('returns true for retryable status with unknown code', () => {
const c = mapDeletionError({ code: 'SOMETHING_NEW', status: 503 });
expect(isDeletionUncertain(c)).toBe(true);
  });

it('returns true for network failure (status 0)', () => {
const c = mapDeletionError({ code: 'NETWORK_FAILURE', status: 0 });
expect(isDeletionUncertain(c)).toBe(true);
  });

it('returns true for the final fallback (unknown code, non-retryable status)', () => {
const c = mapDeletionError({ code: 'SOMETHING_NEW', status: 418 });
expect(isDeletionUncertain(c)).toBe(true);
  });

it('returns false for code-driven branches', () => {
const samples: DeletionErrorInput[] = [
{ code: AUTH_INVALID_CURRENT_PASSWORD, status: 401 },
{ code: AUTH_DELETION_FAILED, status: 409 },
{ code: AUTH_INVALID_TOKEN, status: 401 },
{ code: AUTH_RESOURCE_CONFLICT, status: 409 },
{ code: GLOBAL_VALIDATION_FAILED, status: 400 },
{ code: USER_NOT_FOUND, status: 404 },
    ];
for (const input of samples) {
const c = mapDeletionError(input);
expect(isDeletionUncertain(c)).toBe(false);
    }
  });
});

describe('mapDeletionError — purity', () => {
it('returns the same classification for the same input', () => {

const input: DeletionErrorInput = {
code: AUTH_INVALID_CURRENT_PASSWORD,
status: 401,
    };
const a = mapDeletionError(input);
const b = mapDeletionError(input);
expect(a).toEqual(b);
  });

it('does not mutate the input', () => {

const input: DeletionErrorInput = {
code: AUTH_DELETION_FAILED,
status: 409,
    };
const snapshot = { ...input };
mapDeletionError(input);
expect(input).toEqual(snapshot);
  });

it('does not throw on unknown code', () => {

expect(() =>
mapDeletionError({ code: 'TOTALLY_NEW_CODE', status: 999 }),
    ).not.toThrow();
const result = mapDeletionError({ code: 'TOTALLY_NEW_CODE', status: 999 });
expect(result.kind).toBe('uncertain');
  });
});
