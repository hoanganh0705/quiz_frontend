/**
 * RFC 7807 wire-shape round-trip suite for `ApiError`.
 *
 * Source epic: Epic 1.3 — RFC 7807 Error Model.
 * Source ticket: TKT-1.3.2.3.
 *
 * Round-trips six canonical RFC 7807 fixtures through `ApiError` and
 * asserts every getter (RFC 7807 + legacy soft-deprecation getters)
 * returns the value expected from the fixture body.
 *
 * Fixtures live in `__fixtures__/problem-detail/` and are imported via
 * the `?raw` query string (vitest+rolldown do not always handle direct
 * JSON imports cleanly with TypeScript's `resolveJsonModule`; the
 * `?raw` + `JSON.parse` combination is portable across bundlers).
 */

import { describe, expect, it } from 'vitest';
import type { AxiosError, AxiosResponse } from 'axios';

import { ApiError } from '@/lib/api/core/ApiError';

import fixture404 from './__fixtures__/problem-detail/404-not-found.json?raw';
import fixture401 from './__fixtures__/problem-detail/401-unauthorized.json?raw';
import fixture409 from './__fixtures__/problem-detail/409-conflict.json?raw';
import fixture422 from './__fixtures__/problem-detail/422-validation.json?raw';
import fixture429 from './__fixtures__/problem-detail/429-too-many.json?raw';
import fixtureUnknown from './__fixtures__/problem-detail/unknown-code.json?raw';

/**
 * Build a minimal `AxiosError`-shaped object from a fixture JSON string.
 *
 * The constructor of `ApiError` accepts `AxiosError<unknown>` (TKT-1.3.1.2);
 * this helper returns a structurally compatible object so the spec can
 * exercise the real constructor path without depending on the axios
 * runtime network stack.
 */
function buildAxiosErrorLike(
  fixtureJson: string
): AxiosError<unknown> {
  const body = JSON.parse(fixtureJson) as Record<string, unknown>;
  const status = typeof body.status === 'number' ? body.status : 0;

  const response = {
    data: body,
    status,
    statusText: typeof body.title === 'string' ? body.title : 'Error',
  } as AxiosResponse;

  const err = {
    name: 'AxiosError',
    message: 'Request failed',
    response,
    isAxiosError: true,
    toJSON: () => ({}),
  } as AxiosError<unknown>;

  return err;
}

describe('ApiError — RFC 7807 fixtures', () => {
  it('decodes the 404-not-found fixture', () => {
    const apiError = new ApiError(buildAxiosErrorLike(fixture404));

    // RFC 7807 getters (TKT-1.3.1.2)
    expect(apiError.code).toBe('QUIZ_NOT_FOUND');
    expect(apiError.title).toBe('Not Found');
    expect(apiError.detail).toBe('Quiz with slug trivia-101 not found');
    expect(apiError.instance).toBe('/api/v1/quizzes/trivia-101');
    expect(apiError.requestId).toBe('req-001');
    expect(apiError.correlationId).toBe('req-001');
    expect(apiError.status).toBe(404);
    expect(apiError.isValidationError).toBe(false);
    expect(apiError.isNotFound).toBe(true);
    expect(apiError.isServerError).toBe(false);

    // Legacy getters (TKT-1.3.1.3) — behaviour preserved
    expect(apiError.statusCode).toBe(404);
    expect(apiError.error).toBe('Not Found'); // legacy `error` falls back to `title`
    expect(apiError.message).toBe('Quiz with slug trivia-101 not found');
    expect(apiError.path).toBe('');
    expect(apiError.method).toBe('');
    expect(apiError.validationMessages).toEqual([]);
  });

  it('decodes the 401-unauthorized fixture', () => {
    const apiError = new ApiError(buildAxiosErrorLike(fixture401));

    expect(apiError.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(apiError.title).toBe('Unauthorized');
    expect(apiError.detail).toBe('Invalid email or password');
    expect(apiError.instance).toBe('/api/v1/auth/login');
    expect(apiError.requestId).toBe('req-002');
    expect(apiError.correlationId).toBe('req-002');
    expect(apiError.status).toBe(401);
    expect(apiError.isValidationError).toBe(false);
    expect(apiError.isUnauthorized).toBe(true);
    expect(apiError.isForbidden).toBe(false);

    expect(apiError.statusCode).toBe(401);
    expect(apiError.validationMessages).toEqual([]);
  });

  it('decodes the 409-conflict fixture', () => {
    const apiError = new ApiError(buildAxiosErrorLike(fixture409));

    expect(apiError.code).toBe('QUIZ_SLUG_CONFLICT');
    expect(apiError.title).toBe('Conflict');
    expect(apiError.detail).toBe('A quiz with slug trivia-101 already exists');
    expect(apiError.instance).toBe('/api/v1/quizzes');
    expect(apiError.requestId).toBe('req-003');
    expect(apiError.correlationId).toBe('req-003');
    expect(apiError.status).toBe(409);
    expect(apiError.isValidationError).toBe(false);
    expect(apiError.isConflict).toBe(true);

    expect(apiError.statusCode).toBe(409);
  });

  it('decodes the 422-validation fixture', () => {
    const apiError = new ApiError(buildAxiosErrorLike(fixture422));

    expect(apiError.code).toBe('GLOBAL_VALIDATION_FAILED');
    expect(apiError.title).toBe('Bad Request');
    expect(apiError.status).toBe(422);
    expect(apiError.isValidationError).toBe(true);
    expect(apiError.isUnprocessableEntity).toBe(true);

    // The synthesized-code fallback for `GLOBAL_VALIDATION_FAILED` is
    // conditional on the message being an array. This fixture does not
    // include `message: string[]` at the top level (it uses the
    // canonical RFC 7807 `extensions.code`); the getter still returns
    // `GLOBAL_VALIDATION_FAILED` because the wire body carries it
    // explicitly.
    expect(apiError.validationMessages).toEqual([]);

    // The detail field joins the validationErrors messages so users
    // see a human-readable explanation.
    expect(apiError.detail).toContain('Validation failed');

    // The legacy `validationMessages` getter remains empty for this
    // fixture because the fixture follows the canonical RFC 7807
    // `extensions.validationErrors` shape (Phase 5+ per-field rendering)
    // rather than the legacy `message: string[]` shape.
    expect(apiError.validationMessages).toHaveLength(0);
  });

  it('decodes the 429-too-many fixture', () => {
    const apiError = new ApiError(buildAxiosErrorLike(fixture429));

    expect(apiError.code).toBe('AUTH_RATE_LIMITED');
    expect(apiError.title).toBe('TooManyRequests');
    expect(apiError.detail).toBe(
      'Too many login attempts. Please try again later.'
    );
    expect(apiError.instance).toBe('/api/v1/auth/login');
    expect(apiError.requestId).toBe('req-005');
    expect(apiError.correlationId).toBe('req-005');
    expect(apiError.status).toBe(429);
    expect(apiError.isValidationError).toBe(false);

    expect(apiError.statusCode).toBe(429);
  });

  it('falls back to synthesized code when extensions.code is absent', () => {
    const apiError = new ApiError(buildAxiosErrorLike(fixtureUnknown));

    // The fixture has status 404 and no extensions.code; the synthesized
    // fallback should resolve to GLOBAL_NOT_FOUND.
    expect(apiError.code).toBe('GLOBAL_NOT_FOUND');
    expect(apiError.title).toBe('Not Found');
    expect(apiError.status).toBe(404);
    expect(apiError.requestId).toBe('req-006');
    expect(apiError.correlationId).toBe('req-006');
    expect(apiError.isNotFound).toBe(true);
  });
});
