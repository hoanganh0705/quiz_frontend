/**
 * Login submit handler — single-flight `POST /auth/login`.
 *
 * Source epic: Epic 2.4 — Login, logout, and protected-route return flow.
 * Source ticket: TKT-2.4.B2.
 *
 * ## Single-flight discipline
 *
 * The single-flight guarantee is owned by the `useLogin` hook
 * (`./use-login.ts`); this file is the pure, dependency-injectable
 * function that the hook wraps. Keeping the discipline in the hook
 * (via a `useRef`) instead of module-level state preserves SSR safety
 * and lets the vitest suite substitute a deterministic in-memory
 * implementation without global side-effects.
 *
 * The hook forwards rapid repeated calls to the same in-flight
 * `Promise`; from the caller's perspective the contract is:
 *
 *   "while a previous submitLogin is pending, a second call
 *    resolves to the same result without issuing a second request."
 *
 * ## Token clearing discipline
 *
 * `submitLogin` calls `clearAuthToken()` BEFORE calling the injected
 * `login` dependency. This defeats the stale-token edge case where a
 * logged-out user logs in as a different account (TKT-2.4.B1).
 *
 * ## Error mapping
 *
 * `mapLoginError` (TKT-2.4.B3) is the only place an `ApiError`
 * becomes a UI kind. `submitLogin` swallows the rejection, translates
 * it via the mapper, and resolves with the translated shape — the
 * form never sees a rejected `Promise`.
 *
 * ## Anti-enumeration
 *
 * Every error branch that can reveal account state collapses to
 * `'invalid_credentials'`. The page renders the same neutral body for:
 *
 *   - `AUTH_INVALID_CREDENTIALS` (canonical wrong-email / wrong-password);
 *   - generic `401` (SDK status fallback);
 *   - any backend message matching verify-related phrases.
 *
 * The credentials error body is a single constant sourced from
 * `login-copy.ts`. There is no `'wrong_password'`, `'email_not_found'`,
 * or `'unverified'` kind by design.
 */

import {
  clearAuthToken,
  type ClearAuthTokenFn,
} from '@/features/auth/utils/auth-cookies';
import type { LoginFormValues } from './schemas/login.schema';
import { toLoginDto } from './schemas/login.schema';
import {
  mapLoginError,
  type LoginErrorKind,
} from '@/features/auth/errors/login-error-mapper';
import {
  login as authServiceLogin,
} from '@/features/auth/service/auth.service';
import type {
  AuthControllerLoginResult,
} from '@/lib/api/generated/auth/auth';

export type LoginSubmitResult =
  | { kind: 'success'; user: AuthControllerLoginResult['data'] }
  | {
      kind: 'error';
      errorKind: LoginErrorKind;
    };

export interface SubmitLoginDeps {
  /**
   * The backend `login` call. Re-exported from `auth.service.ts`
   * but injected via this dependency so the unit suite can
   * substitute a stub without mocking modules.
   */
  login: (dto: { email: string; password: string }) => Promise<AuthControllerLoginResult>;
  /**
   * `clearAuthToken` — injected so the unit suite can assert it
   * was called BEFORE `login` on the success path.
   */
  clearAuthToken: ClearAuthTokenFn;
}

/**
 * Default dependencies: the real `auth.service.login` and
 * `auth-cookies.clearAuthToken`. Hooks default to these; tests
 * typically pass stubs.
 */
export const defaultSubmitLoginDeps: SubmitLoginDeps = {
  login: authServiceLogin,
  clearAuthToken,
};

/**
 * Pure, dependency-injectable login submit. Always resolves with a
 * `LoginSubmitResult`; never rejects. Errors are mapped through
 * `mapLoginError`.
 *
 * @param values - the form values, already zod-validated by the caller.
 * @param deps   - the `login` function and `clearAuthToken`.
 */
export async function submitLogin(
  values: LoginFormValues,
  deps: SubmitLoginDeps = defaultSubmitLoginDeps
): Promise<LoginSubmitResult> {
  // Clear any stale token before logging in (TKT-2.4.B1).
  // This defeats the edge case where a user logs out, then logs in
  // as a different account while the old token is still present.
  deps.clearAuthToken();

  try {
    const result = await deps.login(toLoginDto(values));
    return { kind: 'success', user: result.data };
  } catch (err: unknown) {
    const mapped = mapLoginError(err);
    return {
      kind: 'error',
      errorKind: mapped.kind,
    };
  }
}
