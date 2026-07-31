/**
 * OAuth error mapper — unit suite.
 *
 * Source epic: Epic 2.6 — Google sign-in parity.
 * Source ticket: TKT-2.6.T19.
 *
 * ## Coverage contract (per the ticket)
 *
 * All branches of `mapGoogleLoginError` are exercised:
 *
 *   - `AUTH_OAUTH_INVALID_TOKEN` → `'invalid_token'`
 *   - `AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS` → `'account_conflict'`
 *   - `AUTH_OAUTH_LINKING_REQUIRED` → `'linking_required'`
 *   - `429` → `'retryable'`
 *   - `5xx` → `'retryable'`
 *   - Network error (status === 0) → `'retryable'`
 *   - Unknown error → `'retryable'`
 *   - null/undefined input → `'retryable'`
 *
 * ## Pure-function bias
 *
 * The tests do NOT import `axios`, do NOT touch the network, and do
 * NOT import any `@/lib/api/generated/**` symbol. All inputs are
 * synthetic error shapes constructed in the test file.
 */

import { describe, expect, it } from 'vitest';

import { mapGoogleLoginError } from '../oauth-error-mapper';
import { AUTH_OAUTH_INVALID_TOKEN, AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS, AUTH_OAUTH_LINKING_REQUIRED } from '../oauth-error-codes';

// ─────────────────────────────────────────────────────────────────────────────
// Synthetic error-shape constructor.
// Mirrors the pattern from login-flow.spec.ts for consistency.
// ─────────────────────────────────────────────────────────────────────────────

interface FakeApiError {
  code: string;
  status: number;
  isValidationError: boolean;
  isServerError: boolean;
  validationMessages: string[];
}

function apiErrorLike(opts: {
  status: number;
  code?: string;
  validationMessages?: string[];
}): FakeApiError {
  const code =
    opts.code ??
    (opts.status >= 500
      ? 'GLOBAL_INTERNAL_ERROR'
      : opts.status === 429
        ? 'GLOBAL_RATE_LIMITED'
        : opts.status === 401
          ? 'AUTH_INVALID_TOKEN'
          : opts.status === 400
            ? 'GLOBAL_VALIDATION_FAILED'
            : 'GLOBAL_BAD_REQUEST');
  const validationMessages = opts.validationMessages ?? [];
  return {
    code,
    status: opts.status,
    isValidationError:
      code === 'GLOBAL_VALIDATION_FAILED' || validationMessages.length > 0,
    isServerError: opts.status >= 500,
    validationMessages,
  };
}

function asApiError(shape: FakeApiError): unknown {
  return shape;
}

// ─────────────────────────────────────────────────────────────────────────────
// T19 — mapGoogleLoginError
// ─────────────────────────────────────────────────────────────────────────────

describe('mapGoogleLoginError', () => {
  // ─── OAuth-specific error codes ─────────────────────────────────────────────

  it('AUTH_OAUTH_INVALID_TOKEN → invalid_token', () => {
    const err = asApiError(
      apiErrorLike({ status: 401, code: AUTH_OAUTH_INVALID_TOKEN }),
    );
    const result = mapGoogleLoginError(err);
    expect(result.kind).toBe('invalid_token');
  });

  it('AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS → account_conflict', () => {
    const err = asApiError(
      apiErrorLike({ status: 409, code: AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS }),
    );
    const result = mapGoogleLoginError(err);
    expect(result.kind).toBe('account_conflict');
  });

  it('AUTH_OAUTH_LINKING_REQUIRED → linking_required', () => {
    const err = asApiError(
      apiErrorLike({ status: 400, code: AUTH_OAUTH_LINKING_REQUIRED }),
    );
    const result = mapGoogleLoginError(err);
    expect(result.kind).toBe('linking_required');
  });

  // ─── HTTP status codes ──────────────────────────────────────────────────────

  it('429 → retryable', () => {
    const err = asApiError(apiErrorLike({ status: 429 }));
    const result = mapGoogleLoginError(err);
    expect(result.kind).toBe('retryable');
  });

  it('500 → retryable', () => {
    const err = asApiError(apiErrorLike({ status: 500 }));
    const result = mapGoogleLoginError(err);
    expect(result.kind).toBe('retryable');
  });

  it('502 → retryable', () => {
    const err = asApiError(apiErrorLike({ status: 502 }));
    const result = mapGoogleLoginError(err);
    expect(result.kind).toBe('retryable');
  });

  it('503 → retryable', () => {
    const err = asApiError(apiErrorLike({ status: 503 }));
    const result = mapGoogleLoginError(err);
    expect(result.kind).toBe('retryable');
  });

  // ─── Network errors ─────────────────────────────────────────────────────────

  it('network error (status 0) → retryable', () => {
    const err = asApiError(
      apiErrorLike({ status: 0, code: 'NETWORK_ERROR' }),
    );
    // Status 0 with isServerError = false still maps to retryable
    const result = mapGoogleLoginError(err);
    expect(result.kind).toBe('retryable');
  });

  it('network error without code → retryable', () => {
    // Shape with status 0 but no code (simulates network failure)
    const err = asApiError({
      code: '',
      status: 0,
      isValidationError: false,
      isServerError: false,
      validationMessages: [],
    });
    const result = mapGoogleLoginError(err);
    expect(result.kind).toBe('retryable');
  });

  // ─── Unknown / malformed inputs ─────────────────────────────────────────────

  it('null input → retryable', () => {
    const result = mapGoogleLoginError(null);
    expect(result.kind).toBe('retryable');
  });

  it('undefined input → retryable', () => {
    const result = mapGoogleLoginError(undefined);
    expect(result.kind).toBe('retryable');
  });

  it('plain object without ApiError shape → retryable', () => {
    const result = mapGoogleLoginError({ message: 'something went wrong' });
    expect(result.kind).toBe('retryable');
  });

  it('string input → retryable', () => {
    const result = mapGoogleLoginError('error string');
    expect(result.kind).toBe('retryable');
  });

  it('Error object → retryable', () => {
    const result = mapGoogleLoginError(new Error('network failure'));
    expect(result.kind).toBe('retryable');
  });

  // ─── Unknown error codes ────────────────────────────────────────────────────

  it('unknown error code with 401 → retryable', () => {
    const err = asApiError(
      apiErrorLike({ status: 401, code: 'UNKNOWN_CODE' }),
    );
    const result = mapGoogleLoginError(err);
    expect(result.kind).toBe('retryable');
  });

  it('unknown error code with 400 → retryable', () => {
    const err = asApiError(
      apiErrorLike({ status: 400, code: 'SOME_VALIDATION' }),
    );
    const result = mapGoogleLoginError(err);
    expect(result.kind).toBe('retryable');
  });

  // ─── Edge cases ─────────────────────────────────────────────────────────────

  it('error with missing validationMessages → retryable', () => {
    const err = {
      code: 'GLOBAL_INTERNAL_ERROR',
      status: 500,
      isValidationError: false,
      isServerError: true,
    } as unknown;
    const result = mapGoogleLoginError(err);
    expect(result.kind).toBe('retryable');
  });

  it('error with missing isServerError → retryable', () => {
    const err = {
      code: 'GLOBAL_INTERNAL_ERROR',
      status: 500,
      isValidationError: false,
      validationMessages: [],
    } as unknown;
    const result = mapGoogleLoginError(err);
    expect(result.kind).toBe('retryable');
  });

  it('maps to correct kind regardless of validationMessages content', () => {
    // Even if validationMessages has content, OAuth codes take precedence
    const err = asApiError(
      apiErrorLike({
        status: 400,
        code: AUTH_OAUTH_LINKING_REQUIRED,
        validationMessages: ['some validation message'],
      }),
    );
    const result = mapGoogleLoginError(err);
    expect(result.kind).toBe('linking_required');
  });
});
