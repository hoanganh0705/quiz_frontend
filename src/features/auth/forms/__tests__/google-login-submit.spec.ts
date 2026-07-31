/**
 * googleLoginSubmit — unit suite.
 *
 * Source epic: Epic 2.6 — Google sign-in parity.
 * Source ticket: TKT-2.6.T20.
 *
 * ## Coverage contract (per the ticket)
 *
 *   - Success path returns `{ kind: 'success', user }`
 *   - Each error kind mapped correctly:
 *     - `invalid_token` → `{ kind: 'error', errorKind: 'invalid_token' }`
 *     - `account_conflict` → `{ kind: 'error', errorKind: 'account_conflict' }`
 *     - `linking_required` → `{ kind: 'error', errorKind: 'linking_required' }`
 *     - `retryable` → `{ kind: 'error', errorKind: 'retryable' }`
 *   - Dependency injection verified
 *   - Function never rejects
 *
 * ## Token hygiene note
 *
 * Unlike `submitLogin`, `googleLoginSubmit` does NOT call `clearAuthToken()`.
 * The `useGoogleLogin` hook calls `clearAuthToken()` BEFORE invoking
 * `googleLoginSubmit` to handle the authenticated-user edge case.
 * This is a design decision documented in the submit function's JSDoc.
 *
 * ## Pure-function bias
 *
 * The tests do NOT import `axios`, do NOT touch the network, and do
 * NOT import any `@/lib/api/generated/**` symbol. All dependencies
 * are stubbed in the test file.
 */

import { describe, expect, it, vi } from 'vitest';

import { googleLoginSubmit, type GoogleLoginSubmitResult } from '../google-login-submit';
import type { AuthControllerGoogleLoginResult } from '@/lib/api/generated/auth/auth';
import type { GoogleLoginSubmitDeps } from '../google-login-submit';
import type { ClearAuthTokenFn } from '@/features/auth/utils/auth-cookies';

// ─────────────────────────────────────────────────────────────────────────────
// Stub factories.
// ─────────────────────────────────────────────────────────────────────────────

function makeUser(id = 'user-123', email = 'test@example.com') {
  return {
    id,
    email,
    username: 'testuser',
    roles: [] as string[],
  };
}

function makeSuccessResult(user = makeUser()): AuthControllerGoogleLoginResult {
  return {
    data: {
      accessToken: 'access-token-abc',
      user,
    },
    message: 'Login successful',
  };
}

function makeStubGoogleLogin(
  result: AuthControllerGoogleLoginResult,
): (idToken: string) => Promise<AuthControllerGoogleLoginResult> {
  return vi.fn().mockResolvedValue(result);
}

const makeStubClearAuthToken = (): ClearAuthTokenFn => {
  return vi.fn();
};

// ─────────────────────────────────────────────────────────────────────────────
// T20 — googleLoginSubmit
// ─────────────────────────────────────────────────────────────────────────────

describe('googleLoginSubmit', () => {
  describe('success path', () => {
    it('returns { kind: "success", user } on success', async () => {
      const user = makeUser();
      const deps: GoogleLoginSubmitDeps = {
        googleLogin: makeStubGoogleLogin(makeSuccessResult(user)),
        clearAuthToken: makeStubClearAuthToken(),
      };

      const result = await googleLoginSubmit('valid-google-token', deps);

      expect(result.kind).toBe('success');
      expect(result.user).toEqual({
        accessToken: 'access-token-abc',
        user,
      });
    });

    it('clearAuthToken is NOT called by googleLoginSubmit itself', async () => {
      // Note: Unlike submitLogin, googleLoginSubmit does NOT call clearAuthToken.
      // The useGoogleLogin hook calls clearAuthToken BEFORE googleLoginSubmit
      // to handle the authenticated-user edge case.
      const deps: GoogleLoginSubmitDeps = {
        googleLogin: makeStubGoogleLogin(makeSuccessResult()),
        clearAuthToken: makeStubClearAuthToken(),
      };

      await googleLoginSubmit('valid-google-token', deps);

      // clearAuthToken should NOT be called by submit function itself
      // (The hook is responsible for calling clearAuthToken before submit)
      const clearAuthTokenCalls = (deps.clearAuthToken as ReturnType<typeof makeStubClearAuthToken>).mock.calls;
      expect(clearAuthTokenCalls.length).toBe(0);
    });

    it('passes idToken to googleLogin', async () => {
      const idToken = 'my-google-id-token-123';
      const deps: GoogleLoginSubmitDeps = {
        googleLogin: makeStubGoogleLogin(makeSuccessResult()),
        clearAuthToken: makeStubClearAuthToken(),
      };

      await googleLoginSubmit(idToken, deps);

      expect(deps.googleLogin).toHaveBeenCalledWith(idToken);
    });

    it('returns correct user data shape', async () => {
      const user = makeUser('user-456', 'different@example.com');
      const deps: GoogleLoginSubmitDeps = {
        googleLogin: makeStubGoogleLogin(makeSuccessResult(user)),
        clearAuthToken: makeStubClearAuthToken(),
      };

      const result = await googleLoginSubmit('token', deps);

      if (result.kind === 'success') {
        expect(result.user.user.id).toBe('user-456');
        expect(result.user.user.email).toBe('different@example.com');
      } else {
        throw new Error('Expected success');
      }
    });
  });

  describe('error path — oauth-specific errors', () => {
    it('AUTH_OAUTH_INVALID_TOKEN → invalid_token', async () => {
      const deps: GoogleLoginSubmitDeps = {
        googleLogin: vi.fn().mockRejectedValue({
          code: 'AUTH_OAUTH_INVALID_TOKEN',
          status: 401,
          isValidationError: false,
          isServerError: false,
          validationMessages: [],
        }),
        clearAuthToken: makeStubClearAuthToken(),
      };

      const result = await googleLoginSubmit('expired-token', deps);

      expect(result.kind).toBe('error');
      expect((result as { kind: 'error'; errorKind: string }).errorKind).toBe('invalid_token');
    });

    it('AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS → account_conflict', async () => {
      const deps: GoogleLoginSubmitDeps = {
        googleLogin: vi.fn().mockRejectedValue({
          code: 'AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS',
          status: 409,
          isValidationError: false,
          isServerError: false,
          validationMessages: [],
        }),
        clearAuthToken: makeStubClearAuthToken(),
      };

      const result = await googleLoginSubmit('any-token', deps);

      expect(result.kind).toBe('error');
      expect((result as { kind: 'error'; errorKind: string }).errorKind).toBe('account_conflict');
    });

    it('AUTH_OAUTH_LINKING_REQUIRED → linking_required', async () => {
      const deps: GoogleLoginSubmitDeps = {
        googleLogin: vi.fn().mockRejectedValue({
          code: 'AUTH_OAUTH_LINKING_REQUIRED',
          status: 400,
          isValidationError: false,
          isServerError: false,
          validationMessages: [],
        }),
        clearAuthToken: makeStubClearAuthToken(),
      };

      const result = await googleLoginSubmit('any-token', deps);

      expect(result.kind).toBe('error');
      expect((result as { kind: 'error'; errorKind: string }).errorKind).toBe('linking_required');
    });
  });

  describe('error path — retryable errors', () => {
    it('429 → retryable', async () => {
      const deps: GoogleLoginSubmitDeps = {
        googleLogin: vi.fn().mockRejectedValue({
          code: 'GLOBAL_RATE_LIMITED',
          status: 429,
          isValidationError: false,
          isServerError: false,
          validationMessages: [],
        }),
        clearAuthToken: makeStubClearAuthToken(),
      };

      const result = await googleLoginSubmit('any-token', deps);

      expect(result.kind).toBe('error');
      expect((result as { kind: 'error'; errorKind: string }).errorKind).toBe('retryable');
    });

    it('5xx → retryable', async () => {
      const deps: GoogleLoginSubmitDeps = {
        googleLogin: vi.fn().mockRejectedValue({
          code: 'GLOBAL_INTERNAL_ERROR',
          status: 500,
          isValidationError: false,
          isServerError: true,
          validationMessages: [],
        }),
        clearAuthToken: makeStubClearAuthToken(),
      };

      const result = await googleLoginSubmit('any-token', deps);

      expect(result.kind).toBe('error');
      expect((result as { kind: 'error'; errorKind: string }).errorKind).toBe('retryable');
    });

    it('network error → retryable', async () => {
      const deps: GoogleLoginSubmitDeps = {
        googleLogin: vi.fn().mockRejectedValue({
          code: '',
          status: 0,
          isValidationError: false,
          isServerError: false,
          validationMessages: [],
        }),
        clearAuthToken: makeStubClearAuthToken(),
      };

      const result = await googleLoginSubmit('any-token', deps);

      expect(result.kind).toBe('error');
      expect((result as { kind: 'error'; errorKind: string }).errorKind).toBe('retryable');
    });

    it('unknown error → retryable', async () => {
      const deps: GoogleLoginSubmitDeps = {
        googleLogin: vi.fn().mockRejectedValue(new Error('unexpected error')),
        clearAuthToken: makeStubClearAuthToken(),
      };

      const result = await googleLoginSubmit('any-token', deps);

      expect(result.kind).toBe('error');
      expect((result as { kind: 'error'; errorKind: string }).errorKind).toBe('retryable');
    });
  });

  describe('dependency injection', () => {
    it('uses default deps when not provided', async () => {
      // This test verifies the default deps export exists and is usable
      const { defaultGoogleLoginSubmitDeps } = await import('../google-login-submit');

      expect(defaultGoogleLoginSubmitDeps).toBeDefined();
      expect(typeof defaultGoogleLoginSubmitDeps.googleLogin).toBe('function');
      expect(typeof defaultGoogleLoginSubmitDeps.clearAuthToken).toBe('function');
    });

    it('allows custom googleLogin implementation', async () => {
      const customGoogleLogin = vi.fn().mockResolvedValue(makeSuccessResult());
      const deps: GoogleLoginSubmitDeps = {
        googleLogin: customGoogleLogin,
        clearAuthToken: makeStubClearAuthToken(),
      };

      await googleLoginSubmit('custom-token', deps);

      expect(customGoogleLogin).toHaveBeenCalledWith('custom-token');
    });
  });

  describe('never rejects', () => {
    it('rejects from googleLogin are swallowed and returned as error result', async () => {
      const deps: GoogleLoginSubmitDeps = {
        googleLogin: vi.fn().mockRejectedValue(new Error('network failure')),
        clearAuthToken: makeStubClearAuthToken(),
      };

      // Should not throw
      const result = await googleLoginSubmit('any-token', deps);

      // Should return an error result, not throw
      expect(result.kind).toBe('error');
    });

    it('returns result synchronously on thrown non-Error values', async () => {
      const deps: GoogleLoginSubmitDeps = {
        googleLogin: vi.fn().mockRejectedValue('string error'),
        clearAuthToken: makeStubClearAuthToken(),
      };

      const result = await googleLoginSubmit('any-token', deps);

      expect(result.kind).toBe('error');
    });
  });
});
