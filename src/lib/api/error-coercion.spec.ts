/**
 * `coerceToApiError` test suite.
 *
 * Source epic: Phase 3 — `ApiError` constructor + `coerceToApiError`.
 * Source ticket: TKT-Phase-3.E2.
 *
 * Validates the three input branches the helper advertises:
 *   1. `ApiError` pass-through.
 *   2. Axios-shaped (real network + test fixtures) → `ApiError.fromAxios`.
 *   3. Structural `{ code, status, message }` → `ApiError.fromInput`.
 *   4. Unknown → synthetic `GLOBAL_INTERNAL_ERROR` envelope.
 *
 * Every case asserts the getters the rest of the codebase relies on
 * (`code`, `status`, `detail`, `requestId`, `isServerError`).
 */

import { describe, expect, it } from 'vitest';
import type { AxiosError, AxiosResponse } from 'axios';

import { ApiError } from '@/lib/api/core/ApiError';
import { coerceToApiError } from '@/lib/api/error-coercion';

describe('coerceToApiError', () => {
  it('passes ApiError instances through unchanged', () => {
    const original = ApiError.fromInput({
      status: 404,
      code: 'QUIZ_NOT_FOUND',
      message: 'Quiz not found',
    });
    const coerced = coerceToApiError(original);
    // Identity preservation: same instance, no re-wrapping.
    expect(coerced).toBe(original);
    expect(coerced.code).toBe('QUIZ_NOT_FOUND');
    expect(coerced.status).toBe(404);
  });

  it('decodes axios-shaped errors via ApiError.fromAxios', () => {
    const response = {
      data: {
        status: 401,
        title: 'Unauthorized',
        detail: 'Invalid email or password',
        extensions: { code: 'AUTH_INVALID_CREDENTIALS', requestId: 'req-100' },
      },
      status: 401,
      statusText: 'Unauthorized',
    } as AxiosResponse;

    const axiosLike = {
      name: 'AxiosError',
      message: 'Request failed',
      response,
      isAxiosError: true,
      toJSON: () => ({}),
    } as AxiosError<unknown>;

    const coerced = coerceToApiError(axiosLike);
    expect(coerced.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(coerced.status).toBe(401);
    expect(coerced.requestId).toBe('req-100');
    expect(coerced.detail).toBe('Invalid email or password');
  });

  it('decodes structural inputs via ApiError.fromInput', () => {
    // `{ code, status, message }` shape — no axios wrapper, no
    // `as unknown as AxiosError` cast.
    const coerced = coerceToApiError({
      status: 500,
      code: 'GLOBAL_INTERNAL_ERROR',
      message: 'Synthetic envelope',
    });
    expect(coerced.code).toBe('GLOBAL_INTERNAL_ERROR');
    expect(coerced.status).toBe(500);
    expect(coerced.detail).toBe('Synthetic envelope');
  });

  it('synthesizes a GLOBAL_INTERNAL_ERROR envelope for unknown inputs', () => {
    const coerced = coerceToApiError('a string was thrown');
    expect(coerced.code).toBe('GLOBAL_INTERNAL_ERROR');
    expect(coerced.status).toBe(0);
    expect(coerced.detail).toBe('a string was thrown');
    expect(coerced.requestId).toBe('client-unknown');
  });

  it('synthesizes for `Error` instances preserving the message', () => {
    const coerced = coerceToApiError(new Error('boom'));
    expect(coerced.code).toBe('GLOBAL_INTERNAL_ERROR');
    expect(coerced.detail).toBe('boom');
  });

  it('synthesizes for `null` and `undefined`', () => {
    const fromNull = coerceToApiError(null);
    expect(fromNull.code).toBe('GLOBAL_INTERNAL_ERROR');
    expect(fromNull.detail).toBe('null');

    const fromUndefined = coerceToApiError(undefined);
    expect(fromUndefined.code).toBe('GLOBAL_INTERNAL_ERROR');
    expect(fromUndefined.detail).toBe('undefined');
  });
});
