/**
 * Google login submit handler — pure `POST /auth/oauth/google`.
 *
 * Source epic: Epic 2.6 — Google sign-in parity.
 * Source ticket: TKT-2.6.T10.
 *
 * ## Single-flight discipline
 *
 * The single-flight guarantee is owned by the `useGoogleLogin` hook
 * (`./use-google-login.ts`); this file is the pure, dependency-injectable
 * function that the hook wraps. Keeping the discipline in the hook
 * (via a `useRef`) instead of module-level state preserves SSR safety
 * and lets the vitest suite substitute a deterministic in-memory
 * implementation without global side-effects.
 *
 * The hook forwards rapid repeated calls to the same in-flight
 * `Promise`; from the caller's perspective the contract is:
 *
 *   "while a previous googleLoginSubmit is pending, a second call
 *    resolves to the same result without issuing a second request."
 *
 * ## Token hygiene
 *
 * `googleLoginSubmit` does NOT call `clearAuthToken()` itself.
 * The `useGoogleLogin` hook is responsible for clearing the token
 * before initiating a new sign-in attempt (to handle the case where
 * an authenticated user initiates Google sign-in for another account).
 *
 * This differs from `submitLogin` which calls `clearAuthToken()` here.
 * The reason: Google sign-in is initiated from the login page where
 * the user is not authenticated. For credential login, we clear the
 * token to handle edge cases. For Google login, we clear in the hook
 * for the authenticated-user edge case.
 *
 * ## Error mapping
 *
 * `mapGoogleLoginError` (TKT-2.6.T2) is the only place an `ApiError`
 * becomes a UI kind. `googleLoginSubmit` swallows the rejection, translates
 * it via the mapper, and resolves with the translated shape — the
 * hook never sees a rejected `Promise`.
 *
 * ## Anti-enumeration
 *
 * The OAuth error codes `AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS` and
 * `AUTH_OAUTH_LINKING_REQUIRED` are surfaced as distinct error kinds
 * (`'account_conflict'` and `'linking_required'`) because:
 *
 *   1. The user has a path to resolve (sign in with password).
 *   2. The message is actionable, not just "wrong credentials".
 *
 * The copy for these kinds is carefully worded to not reveal whether
 * an account exists — see `login-copy.ts` for the exact strings.
 */

import {
  clearAuthToken,
  type ClearAuthTokenFn,
} from "@/features/auth/utils/auth-cookies";
import {
  mapGoogleLoginError,
  type GoogleLoginErrorKind,
} from "@/features/auth/errors/oauth-error-mapper";
import {
  googleLogin as authServiceGoogleLogin,
} from "@/features/auth/services/auth.service";
import type {
  AuthControllerGoogleLoginResult,
} from "@/lib/api/generated/auth/auth";
import type { LoginResponseDto } from "@/lib/api/generated/schemas/loginResponseDto";

export type GoogleLoginSubmitResult =
  | { kind: 'success'; user: LoginResponseDto }
  | {
      kind: 'error';
      errorKind: GoogleLoginErrorKind;
    };

export interface GoogleLoginSubmitDeps {
  /**
   * The backend `googleLogin` call. Re-exported from `auth.service.ts`
   * but injected via this dependency so the unit suite can substitute
   * a stub without mocking modules.
   */
  googleLogin: (idToken: string) => Promise<AuthControllerGoogleLoginResult>;
  /**
   * `clearAuthToken` — injected so the unit suite can verify it was
   * called. Note: unlike `submitLogin`, this is called by the hook
   * (useGoogleLogin), not here, to handle the authenticated-user edge case.
   */
  clearAuthToken: ClearAuthTokenFn;
}

/**
 * Default dependencies: the real `auth.service.googleLogin` and
 * `auth-cookies.clearAuthToken`. Hooks default to these; tests
 * typically pass stubs.
 */
export const defaultGoogleLoginSubmitDeps: GoogleLoginSubmitDeps = {
  googleLogin: authServiceGoogleLogin,
  clearAuthToken,
};

/**
 * Pure, dependency-injectable Google login submit. Always resolves with a
 * `GoogleLoginSubmitResult`; never rejects. Errors are mapped through
 * `mapGoogleLoginError`.
 *
 * @param idToken - The Google ID token from the Google Identity Services library.
 * @param deps   - the `googleLogin` function and `clearAuthToken`.
 *
 * @note Unlike `submitLogin`, this function does NOT call `clearAuthToken()`
 * internally. The caller (useGoogleLogin hook) is responsible for clearing
 * the token before initiating a new sign-in to handle the authenticated-user
 * edge case.
 */
export async function googleLoginSubmit(
  idToken: string,
  deps: GoogleLoginSubmitDeps = defaultGoogleLoginSubmitDeps,
): Promise<GoogleLoginSubmitResult> {
  try {
    // Same envelope-unwrap contract as `submitLogin` — the SDK
    // interceptor in `custom-instance.ts` strips the `{ data, meta }`
    // envelope before this resolves. The static SDK type still claims
    // the wrapped envelope, so we cast through `unknown` to narrow to
    // the inner `LoginResponseDto`.
    const result = (await deps.googleLogin(idToken)) as unknown as LoginResponseDto;
    return { kind: 'success', user: result };
  } catch (err: unknown) {
    const mapped = mapGoogleLoginError(err);
    return {
      kind: 'error',
      errorKind: mapped.kind,
    };
  }
}
