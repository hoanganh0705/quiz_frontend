

import { describe, expect, it } from 'vitest';
import type { AxiosError, AxiosResponse } from 'axios';

import { ApiError } from '@/lib/api/core/ApiError';

import fixture404 from './__fixtures__/problem-detail/404-not-found.json?raw';
import fixture401 from './__fixtures__/problem-detail/401-unauthorized.json?raw';
import fixture409 from './__fixtures__/problem-detail/409-conflict.json?raw';
import fixture422 from './__fixtures__/problem-detail/422-validation.json?raw';
import fixture429 from './__fixtures__/problem-detail/429-too-many.json?raw';
import fixtureUnknown from './__fixtures__/problem-detail/unknown-code.json?raw';

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

expect(apiError.statusCode).toBe(404);
expect(apiError.error).toBe('Not Found');
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

expect(apiError.validationMessages).toEqual([]);

expect(apiError.detail).toContain('Validation failed');

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

expect(apiError.code).toBe('GLOBAL_NOT_FOUND');
expect(apiError.title).toBe('Not Found');
expect(apiError.status).toBe(404);
expect(apiError.requestId).toBe('req-006');
expect(apiError.correlationId).toBe('req-006');
expect(apiError.isNotFound).toBe(true);
  });
});
