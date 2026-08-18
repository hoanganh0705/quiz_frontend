

import { describe, expect, it } from 'vitest';
import {
mapSessionError,
isAlreadyRevoked,
isCurrentRevoked,
isAuthTerminalSessionError,
isSessionErrorRetryable,
isSessionConflict,
type SessionErrorInput,
type SessionErrorTarget,
} from '../session-error-mapper';
import {
AUTH_SESSION_NOT_FOUND,
AUTH_INVALID_TOKEN,
AUTH_RESOURCE_CONFLICT,
SESSION_RECOVERYABLE_STATUSES,
} from '../session-error-codes';

describe('mapSessionError — AUTH_SESSION_NOT_FOUND', () => {
it('classifies AUTH_SESSION_NOT_FOUND on target "other" as already_revoked', () => {
const result = mapSessionError({
code: AUTH_SESSION_NOT_FOUND,
status: 404,
target: 'other',
    });
expect(result.kind).toBe('already_revoked');
expect(result.code).toBe(AUTH_SESSION_NOT_FOUND);
expect(result.status).toBe(404);
expect(result.target).toBe('other');
  });

it('classifies AUTH_SESSION_NOT_FOUND on target "self" as current_revoked', () => {
const result = mapSessionError({
code: AUTH_SESSION_NOT_FOUND,
status: 404,
target: 'self',
    });
expect(result.kind).toBe('current_revoked');
expect(result.code).toBe(AUTH_SESSION_NOT_FOUND);
expect(result.status).toBe(404);

expect(result.target).toBe('self');
  });

it('classifies AUTH_SESSION_NOT_FOUND on target "list" as already_revoked', () => {
const result = mapSessionError({
code: AUTH_SESSION_NOT_FOUND,
status: 404,
target: 'list',
    });
expect(result.kind).toBe('already_revoked');
expect(result.target).toBe('list');
  });

it('classifies AUTH_SESSION_NOT_FOUND on target "dashboard" as already_revoked', () => {
const result = mapSessionError({
code: AUTH_SESSION_NOT_FOUND,
status: 404,
target: 'dashboard',
    });
expect(result.kind).toBe('already_revoked');
expect(result.target).toBe('dashboard');
  });

it('classifies AUTH_SESSION_NOT_FOUND on target "revoke-others" as already_revoked', () => {
const result = mapSessionError({
code: AUTH_SESSION_NOT_FOUND,
status: 404,
target: 'revoke-others',
    });
expect(result.kind).toBe('already_revoked');
expect(result.target).toBe('revoke-others');
  });

it('classifies AUTH_SESSION_NOT_FOUND on target "logout-all" as already_revoked', () => {
const result = mapSessionError({
code: AUTH_SESSION_NOT_FOUND,
status: 404,
target: 'logout-all',
    });
expect(result.kind).toBe('already_revoked');
expect(result.target).toBe('logout-all');
  });
});

describe('mapSessionError — AUTH_INVALID_TOKEN', () => {
it.each<SessionErrorTarget>([
'self',
'other',
'list',
'revoke-others',
'dashboard',
'logout-all',
  ])('classifies AUTH_INVALID_TOKEN on target "%s" as auth_terminal', (target) => {
const result = mapSessionError({
code: AUTH_INVALID_TOKEN,
status: 401,
target,
    });
expect(result.kind).toBe('auth_terminal');
expect(result.code).toBe(AUTH_INVALID_TOKEN);
expect(result.status).toBe(401);
expect(result.target).toBe(target);
  });
});

describe('mapSessionError — AUTH_RESOURCE_CONFLICT', () => {
it.each<SessionErrorTarget>([
'self',
'other',
'list',
'revoke-others',
'dashboard',
'logout-all',
  ])('classifies AUTH_RESOURCE_CONFLICT on target "%s" as conflict', (target) => {
const result = mapSessionError({
code: AUTH_RESOURCE_CONFLICT,
status: 409,
target,
    });
expect(result.kind).toBe('conflict');
expect(result.code).toBe(AUTH_RESOURCE_CONFLICT);
expect(result.status).toBe(409);
expect(result.target).toBe(target);
  });
});

describe('mapSessionError — retryable statuses', () => {
it.each(SESSION_RECOVERYABLE_STATUSES)(
'classifies status %d as retryable regardless of code',
(status) => {
const result = mapSessionError({
code: 'SOME_UNRECOGNIZED_CODE',
status,
target: 'other',
      });
expect(result.kind).toBe('retryable');
expect(result.status).toBe(status);
expect(result.code).toBe('SOME_UNRECOGNIZED_CODE');
expect(result.target).toBe('other');
    },
  );

it('classifies network failure (status 0) with empty code as retryable', () => {
const result = mapSessionError({
code: '',
status: 0,
target: 'list',
    });
expect(result.kind).toBe('retryable');
expect(result.status).toBe(0);
expect(result.target).toBe('list');
  });

it('classifies 429 rate-limit as retryable', () => {
const result = mapSessionError({
code: 'GLOBAL_RATE_LIMITED',
status: 429,
target: 'revoke-others',
    });
expect(result.kind).toBe('retryable');
expect(result.status).toBe(429);
  });

it('classifies 500 server error as retryable', () => {
const result = mapSessionError({
code: 'INTERNAL_SERVER_ERROR',
status: 500,
target: 'dashboard',
    });
expect(result.kind).toBe('retryable');
expect(result.status).toBe(500);
  });

it('classifies 503 unavailable as retryable', () => {
const result = mapSessionError({
code: 'SERVICE_UNAVAILABLE',
status: 503,
target: 'logout-all',
    });
expect(result.kind).toBe('retryable');
expect(result.status).toBe(503);
  });
});

describe('mapSessionError — unknown codes', () => {
it('classifies unknown code + 400 BadRequest as retryable', () => {
const result = mapSessionError({
code: 'SOMETHING_NEW',
status: 400,
target: 'other',
    });
expect(result.kind).toBe('retryable');
expect(result.target).toBe('other');
  });

it('classifies unknown code + 200 OK as retryable (defensive fallback)', () => {

const result = mapSessionError({
code: 'BRAND_NEW_CODE',
status: 200,
target: 'list',
    });
expect(result.kind).toBe('retryable');
expect(result.status).toBe(200);
  });

it('classifies empty code + 401 as retryable (falls to status branch)', () => {

const result = mapSessionError({
code: '',
status: 401,
target: 'other',
    });
expect(result.kind).toBe('retryable');
  });
});

describe('mapSessionError — branch precedence', () => {
it('AUTH_SESSION_NOT_FOUND wins over retryable status', () => {

const result = mapSessionError({
code: AUTH_SESSION_NOT_FOUND,
status: 503,
target: 'other',
    });
expect(result.kind).toBe('already_revoked');
  });

it('AUTH_INVALID_TOKEN wins over retryable status', () => {
const result = mapSessionError({
code: AUTH_INVALID_TOKEN,
status: 500,
target: 'other',
    });
expect(result.kind).toBe('auth_terminal');
  });

it('AUTH_RESOURCE_CONFLICT wins over retryable status', () => {
const result = mapSessionError({
code: AUTH_RESOURCE_CONFLICT,
status: 429,
target: 'other',
    });
expect(result.kind).toBe('conflict');
  });

it('preserves the original status even when the kind is its own bucket', () => {
const result = mapSessionError({
code: AUTH_INVALID_TOKEN,
status: 401,
target: 'other',
    });
expect(result.kind).toBe('auth_terminal');
expect(result.status).toBe(401);
  });

it('preserves the original code in every classification', () => {
const cases: SessionErrorInput[] = [
{ code: AUTH_SESSION_NOT_FOUND, status: 404, target: 'other' },
{ code: AUTH_INVALID_TOKEN, status: 401, target: 'other' },
{ code: AUTH_RESOURCE_CONFLICT, status: 409, target: 'other' },
{ code: 'X', status: 500, target: 'other' },
{ code: 'Y', status: 0, target: 'other' },
    ];
for (const input of cases) {
const result = mapSessionError(input);
expect(result.code).toBe(input.code);
    }
  });
});

describe('mapSessionError — type guards', () => {
it('isAlreadyRevoked matches "already_revoked" classification', () => {
const result = mapSessionError({
code: AUTH_SESSION_NOT_FOUND,
status: 404,
target: 'other',
    });
expect(isAlreadyRevoked(result)).toBe(true);
expect(isCurrentRevoked(result)).toBe(false);
expect(isAuthTerminalSessionError(result)).toBe(false);
expect(isSessionErrorRetryable(result)).toBe(false);
expect(isSessionConflict(result)).toBe(false);
  });

it('isCurrentRevoked matches "current_revoked" classification', () => {
const result = mapSessionError({
code: AUTH_SESSION_NOT_FOUND,
status: 404,
target: 'self',
    });
expect(isAlreadyRevoked(result)).toBe(false);
expect(isCurrentRevoked(result)).toBe(true);
expect(isAuthTerminalSessionError(result)).toBe(false);
expect(isSessionErrorRetryable(result)).toBe(false);
expect(isSessionConflict(result)).toBe(false);
  });

it('isAuthTerminalSessionError matches "auth_terminal" classification', () => {
const result = mapSessionError({
code: AUTH_INVALID_TOKEN,
status: 401,
target: 'other',
    });
expect(isAlreadyRevoked(result)).toBe(false);
expect(isCurrentRevoked(result)).toBe(false);
expect(isAuthTerminalSessionError(result)).toBe(true);
expect(isSessionErrorRetryable(result)).toBe(false);
expect(isSessionConflict(result)).toBe(false);
  });

it('isSessionConflict matches "conflict" classification', () => {
const result = mapSessionError({
code: AUTH_RESOURCE_CONFLICT,
status: 409,
target: 'other',
    });
expect(isAlreadyRevoked(result)).toBe(false);
expect(isCurrentRevoked(result)).toBe(false);
expect(isAuthTerminalSessionError(result)).toBe(false);
expect(isSessionErrorRetryable(result)).toBe(false);
expect(isSessionConflict(result)).toBe(true);
  });

it('isSessionErrorRetryable matches "retryable" classification', () => {
const result = mapSessionError({
code: 'UNKNOWN',
status: 500,
target: 'other',
    });
expect(isSessionErrorRetryable(result)).toBe(true);
expect(isAlreadyRevoked(result)).toBe(false);
expect(isCurrentRevoked(result)).toBe(false);
expect(isAuthTerminalSessionError(result)).toBe(false);
expect(isSessionConflict(result)).toBe(false);
  });

it('exactly one type guard is true for every classification', () => {
const inputs: SessionErrorInput[] = [
{ code: AUTH_SESSION_NOT_FOUND, status: 404, target: 'other' },
{ code: AUTH_SESSION_NOT_FOUND, status: 404, target: 'self' },
{ code: AUTH_INVALID_TOKEN, status: 401, target: 'other' },
{ code: AUTH_RESOURCE_CONFLICT, status: 409, target: 'other' },
{ code: 'UNKNOWN', status: 500, target: 'other' },
{ code: 'UNKNOWN', status: 0, target: 'other' },
    ];
for (const input of inputs) {
const result = mapSessionError(input);
const guardCount = [
isAlreadyRevoked(result),
isCurrentRevoked(result),
isAuthTerminalSessionError(result),
isSessionErrorRetryable(result),
isSessionConflict(result),
      ].filter(Boolean).length;
expect(guardCount).toBe(1);
    }
  });
});

describe('mapSessionError — list and dashboard targets', () => {
it('list target preserves `target: "list"` in already_revoked classification', () => {
const result = mapSessionError({
code: AUTH_SESSION_NOT_FOUND,
status: 404,
target: 'list',
    });
expect(result.kind).toBe('already_revoked');
expect(result.target).toBe('list');
  });

it('dashboard target preserves `target: "dashboard"` in retryable classification', () => {
const result = mapSessionError({
code: 'GLOBAL_INTERNAL_ERROR',
status: 500,
target: 'dashboard',
    });
expect(result.kind).toBe('retryable');
expect(result.target).toBe('dashboard');
  });

it('list target with auth_terminal preserves `target: "list"`', () => {
const result = mapSessionError({
code: AUTH_INVALID_TOKEN,
status: 401,
target: 'list',
    });
expect(result.kind).toBe('auth_terminal');
expect(result.target).toBe('list');
  });

it('dashboard target with conflict preserves `target: "dashboard"`', () => {
const result = mapSessionError({
code: AUTH_RESOURCE_CONFLICT,
status: 409,
target: 'dashboard',
    });
expect(result.kind).toBe('conflict');
expect(result.target).toBe('dashboard');
  });
});
