/**
 * Auth service — the thin pass-through between feature code and the generated SDK.
 *
 * Source epic: Epic 2.1 — Registration form and availability guidance.
 * Source tickets:
 *   - TKT-2.1.B1 — `checkEmail` / `checkUsername` re-exports.
 *   - TKT-2.1.E2 — `register` / `login` / `logout` / `logoutAll` /
 *     `verifyEmail` / `resendVerificationEmail` re-exports.
 *
 * ## Boundaries
 *
 * This module is the ONLY file under `src/features/auth/**` that may import
 * from `@/lib/api/generated/**`. All other feature code must import from
 * `@/lib/api` (the public barrel — `customInstance`, `getAuth`, `ApiError`,
 * `isApiError`, …) or from this service. The `no-restricted-imports` lint
 * rule on `axios` is enforced by `eslint.config.mjs`.
 *
 * If something lives outside that boundary (e.g. a hook that needs `getAuth`
 * directly for a side-effecting call), it should be added to this service and
 * re-exported here. Do not bypass this module from feature code.
 *
 * ## Cross-cutting side-effects
 *
 * Before TKT-2.1.E2, those side-effects lived on
 * `features/auth/wrappers/auth.wrapper.ts` and were scattered across each
 * endpoint (e.g. `login()` set the cookie, `logout()` cleared it,
 * `BroadcastChannel('auth')` events fired on each transition). After this
 * ticket, side-effects live in this service, behind four hooks:
 *
 *   - `withCredentials` (axios) – the cookie domain;
 *   - `setAuthToken` / `clearAuthToken` (TKT-2.1.B cookies utility);
 *   - `BroadcastChannel('auth')` for cross-tab sync (TKT-1.4);
 *   - `orvalCustomInstance` envelope unwrapping (TKT-1.4).
 *
 * Service authors MUST NOT import `axios` directly; only `getAuth` (the SDK
 * builder) is allowed. The `no-restricted-imports` rule keeps us honest.
 *
 * ## Anti-enumeration
 *
 * The POST aliases `authControllerCheckEmailDeprecated` and
 * `authControllerCheckUsernameDeprecated` exist in the generated SDK (see
 * `src/lib/api/generated/auth/auth.ts` JSDoc: `@deprecated…this POST route
 * will be removed in the next minor version`). The cross-epic contract rule
 * is "never integrate the deprecated POST aliases"; this module honours that
 * by not exporting them. Feature code has no path to the deprecated variants.
 */

import {
  AuthControllerCheckEmailParams,
  AuthControllerCheckUsernameParams,
  getAuth,
} from "@/lib/api";
import {
  setAuthToken,
  clearAuthToken,
} from "@/features/auth/utils/auth-cookies";
import { clearAllAuthCache } from "@/features/auth/utils/user-scoped-cache";
import {
  broadcastAuthEvent,
  type LoggedInEvent,
} from "@/lib/api/core/broadcast-channel";
import type {
  AuthControllerCheckEmailResult,
  AuthControllerCheckUsernameResult,
  AuthControllerForgotPasswordResult,
  AuthControllerGoogleLoginResult,
  AuthControllerLoginResult,
  AuthControllerLogoutResult,
  AuthControllerLogoutAllResult,
  AuthControllerRegisterResult,
  AuthControllerResendVerificationEmailResult,
  AuthControllerResetPasswordResult,
  AuthControllerVerifyEmailResult,
} from "@/lib/api/generated/auth/auth";

/**
 * Broadcast a login event for cross-tab synchronization.
 *
 * Source epic: Epic 2.7 — Access-token refresh and cross-tab session synchronization.
 * Source ticket: 2.7.T15.
 *
 * Uses the centralized BroadcastChannel manager so the cross-tab listener
 * in `src/lib/api/core/custom-instance.ts` and auth bootstrap context can
 * pick up the new session.
 */
function broadcastLogin(
  userId: string,
  accessToken: string,
): void {
  const event: Omit<LoggedInEvent, 'tabId' | 'timestamp'> = {
    type: 'LOGGED_IN',
    userId,
    accessToken,
  };
  broadcastAuthEvent(event);
}

/**
 * Broadcast a logout event using the centralized channel.
 *
 * Falls back gracefully when `BroadcastChannel` is unavailable — the
 * storage sync fallback will handle cross-tab sync.
 */
function broadcastLogout(): void {
  broadcastAuthEvent({ type: 'LOGGED_OUT' });
}

/**
 * Broadcast a token refresh event using the centralized channel.
 */
function broadcastTokenRefreshed(accessToken: string): void {
  broadcastAuthEvent({
    type: 'TOKEN_REFRESHED',
    accessToken,
  });
}

/**
 * `GET /api/v1/auth/check-email?email=...`
 *
 * Returns whether the email is available for registration. The backend's
 * response intentionally does NOT reveal whether an account exists — it
 * returns `{ available: boolean }` regardless of cause. Anti-enumeration is
 * the backend's responsibility; this module does not shape that contract,
 * only forwards to the SDK.
 *
 * The endpoint is throttled (`AUTH_THROTTLE.checkAvailability`); the hook
 * layer is responsible for debouncing and 429 back-off.
 *
 * @throws `ApiError` on any non-2xx response (including `429`/`5xx`).
 * Callers in feature code MUST route through `mapAvailabilityError`
 * (TKT-2.1.B2) and never inspect the raw error or HTTP status. Status
 * inspection is the path that leaks account existence.
 */
export async function checkEmail(
  params: AuthControllerCheckEmailParams,
): Promise<AuthControllerCheckEmailResult> {
  return getAuth().authControllerCheckEmail(params);
}

/**
 * `GET /api/v1/auth/check-username?username=...`
 *
 * Symmetric counterpart of `checkEmail`. Same anti-enumeration contract; the
 * response intentionally does NOT reveal whether the username exists or is
 * reserved.
 *
 * @throws `ApiError` on any non-2xx response. Route failures through
 * `mapAvailabilityError` (TKT-2.1.B2).
 */
export async function checkUsername(
  params: AuthControllerCheckUsernameParams,
): Promise<AuthControllerCheckUsernameResult> {
  return getAuth().authControllerCheckUsername(params);
}

/**
 * `POST /api/v1/auth/register`
 *
 * The backend intentionally returns a 201 with a generic message regardless
 * of whether the email/username is already registered, to prevent account
 * enumeration. Clients should treat a 201 as "your request was received" and
 * attempt to log in (or check the inbox) to determine the outcome.
 *
 * @throws `ApiError`. Route failures through `mapRegisterError` (TKT-2.1.B2).
 */
export async function register(
  dto: Parameters<ReturnType<typeof getAuth>["authControllerRegister"]>[0],
): Promise<AuthControllerRegisterResult> {
  return getAuth().authControllerRegister(dto);
}

/**
 * `POST /api/v1/auth/login`
 *
 * Persists the access token in the `auth_token` cookie and broadcasts a
 * cross-tab `TOKEN_REFRESHED` so other tabs pick up the new token. The
 * refresh token arrives via a `Set-Cookie` from the backend (HttpOnly)
 * and is never read in JS.
 *
 * ## Side-effect ownership (TKT-2.4.B1)
 *
 * This function is **not** a pure forwarder — it carries the cookie-set
 * + broadcast side-effects because the cross-tab listener in
 * `src/lib/api/core/custom-instance.ts` already knows how to handle a
 * `TOKEN_REFRESHED` message (it updates the SDK's in-memory token +
 * re-issues any in-flight requests). Centralising the side-effect in
 * this module means every consumer (login page, refresh-on-401 hook,
 * future re-auth flow) reaches the cross-tab state for free.
 *
 * The C1 hook (`useLogin`) is responsible for:
 *
 *   1. **Ordering**: `submitLogin` calls `clearAuthToken()` BEFORE
 *      this function runs (TKT-2.4.B2) to defeat the stale-token edge
 *      case where a logged-out user logs in as a different account.
 *   2. **Post-success orchestration**: it routes the user to
 *      `intendedRedirect ?? '/quizzes'` and fires `useFetchCurrentUser`.
 *
 * This function itself does not navigate; it returns the SDK result
 * and the hook composes the rest.
 */
export async function login(
  dto: Parameters<ReturnType<typeof getAuth>["authControllerLogin"]>[0],
): Promise<AuthControllerLoginResult> {
  const data = await getAuth().authControllerLogin(dto);
  const accessToken = data.data.accessToken;

  setAuthToken(accessToken);

  // Source epic: Epic 2.7 — cross-tab login sync (US-2.7.2).
  // Source ticket: 2.7.T15 — broadcast LOGGED_IN so other tabs can pick up
  // the new session and trigger their bootstrap path.
  //
  // `user` is the current-user identity returned by the login endpoint; we
  // forward its `id` to other tabs so the AuthBootstrapContext (T16) can
  // detect a "different user" login and re-bootstrap.
  const userId = (data.data as { user?: { id?: string }; id?: string })?.user?.id
    ?? (data.data as { id?: string })?.id
    ?? '';

  if (userId) {
    broadcastLogin(userId, accessToken);
  }

  // Keep TOKEN_REFRESHED as a fallback message for older listeners that
  // only know how to react to token updates (e.g. background tabs without
  // a mounted AuthBootstrapProvider).
  broadcastTokenRefreshed(accessToken);

  return data;
}

/**
 * `POST /api/v1/auth/oauth/google`
 *
 * Authenticates using a Google ID token and establishes the same session
 * as credential login. The Google ID token is obtained from the Google
 * Identity Services library (GIS) after the user completes the OAuth flow.
 *
 * Source epic: Epic 2.6 — Google sign-in parity.
 * Source ticket: TKT-2.6.T7.
 *
 * ## Session parity with credential login
 *
 * On success, this function:
 *   1. Sets the `auth_token` cookie with the access token.
 *   2. Broadcasts `TOKEN_REFRESHED` to other tabs (cross-tab sync).
 *
 * The backend sets the HttpOnly refresh token cookie via `Set-Cookie`.
 * The refresh token is never read in JavaScript.
 *
 * ## Error handling contract
 *
 * This function does NOT catch errors. It is the caller's responsibility
 * to map errors via `mapGoogleLoginError` (TKT-2.6.T2). The mapper
 * translates backend `AUTH_OAUTH_*` codes into UI-facing kinds:
 *
 *   - `AUTH_OAUTH_INVALID_TOKEN` → `'invalid_token'`
 *   - `AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS` → `'account_conflict'`
 *   - `AUTH_OAUTH_LINKING_REQUIRED` → `'linking_required'`
 *   - 429, 5xx, network → `'retryable'`
 *
 * ## Token hygiene
 *
 * The caller (typically `googleLoginSubmit` in the form layer) is
 * responsible for calling `clearAuthToken()` BEFORE this function to
 * defeat the stale-token edge case where a logged-out user signs in
 * as a different account.
 *
 * @param idToken - The Google ID token from the Google Identity Services library.
 * @throws `ApiError` on any non-2xx response. Callers MUST route through
 *         `mapGoogleLoginError`.
 */
export async function googleLogin(
  idToken: string,
): Promise<AuthControllerGoogleLoginResult> {
  const data = await getAuth().authControllerGoogleLogin({ idToken });
  const accessToken = data.data.accessToken;

  setAuthToken(accessToken);

  // Source epic: Epic 2.7 — cross-tab login sync (US-2.7.2).
  // Source ticket: 2.7.T15.
  const userId = (data.data as { user?: { id?: string }; id?: string })?.user?.id
    ?? (data.data as { id?: string })?.id
    ?? '';

  if (userId) {
    broadcastLogin(userId, accessToken);
  }

  // Legacy TOKEN_REFRESHED for older listeners.
  broadcastTokenRefreshed(accessToken);

  return data;
}

/**
 * `POST /api/v1/auth/logout`
 *
 * Always succeeds (idempotent). Clears the local access-token cookie and
 * broadcasts a cross-tab `LOGGED_OUT` event so other tabs redirect to
 * `/login` in lockstep.
 *
 * ## `finally`-path cleanup discipline (TKT-2.4.B1)
 *
 * The SDK call is wrapped in `try { ... } finally { ... }` so the
 * local cleanup (`clearAuthToken()` + `LOGGED_OUT` broadcast) runs
 * on EVERY code path:
 *
 *   - successful backend response (`201`),
 *   - thrown `ApiError` (`401`, `5xx`, network, etc.),
 *   - synchronous throw from inside `getAuth().authControllerLogout()`.
 *
 * The contract is non-negotiable: the user must always reach a public
 * surface after clicking Sign Out, regardless of the backend's
 * response. The unit suite (TKT-2.4.D3) verifies the discipline by
 * stubbing the SDK to throw and asserting the cleanup still fired.
 *
 * This function is the only place in the codebase that calls
 * `clearAuthToken()` for the logout path. Hooks that wrap this
 * function (`useLogout`, `useLogoutMenu`) MUST NOT clear the cookie
 * themselves — duplicating the cleanup is a foot-gun (a buggy
 * future hook might call `clearAuthToken` before the SDK resolves
 * and break the broadcast ordering).
 */
export async function logout(): Promise<AuthControllerLogoutResult> {
  try {
    return await getAuth().authControllerLogout();
  } finally {
    clearAuthToken();
    clearAllAuthCache();
    broadcastLogout();
  }
}

/**
 * `POST /api/v1/auth/logout-all` — invalidates ALL active sessions.
 * Same cookie / broadcast invariant as `logout()`.
 */
export async function logoutAll(): Promise<AuthControllerLogoutAllResult> {
  try {
    return await getAuth().authControllerLogoutAll();
  } finally {
    clearAuthToken();
    clearAllAuthCache();
    broadcastLogout();
  }
}

/**
 * `POST /api/v1/auth/verify-email`
 *
 * Returns the same generic acknowledgement message regardless of whether
 * the token is valid, expired, or unknown. Anti-enumeration is the
 * backend's invariant; this module is a pure forwarder.
 */
export async function verifyEmail(
  dto: Parameters<ReturnType<typeof getAuth>["authControllerVerifyEmail"]>[0],
): Promise<AuthControllerVerifyEmailResult> {
  return getAuth().authControllerVerifyEmail(dto);
}

/**
 * `POST /api/v1/auth/resend-verification-email`
 *
 * Sends a fresh verification email if the address is eligible. The backend
 * returns a generic acknowledgement regardless of whether the account
 * exists / is already verified; the client cannot tell.
 */
export async function resendVerificationEmail(
  dto: Parameters<
    ReturnType<typeof getAuth>["authControllerResendVerificationEmail"]
  >[0],
): Promise<AuthControllerResendVerificationEmailResult> {
  return getAuth().authControllerResendVerificationEmail(dto);
}

/**
 * `POST /api/v1/auth/forgot-password`
 *
 * Source epic: Epic 2.3 — Forgot-password and reset-password recovery.
 * Source tickets: TKT-2.3.B1, TKT-2.3.A1 (SDK verification).
 *
 * Initiates the password-recovery flow. Returns a generic acknowledgment
 * regardless of whether the address exists / is unverified / is verified
 * — anti-enumeration is the backend's invariant; this module is a pure
 * forwarder. The 429/5xx surface the backend emits is collapsed into the
 * same envelope by the B2 mapper.
 *
 * Anonymous call: no cookie or broadcast side-effects. The user is not
 * authenticated, so the cross-tab sync machinery in `login` / `logout`
 * does not apply.
 */
export async function forgotPassword(
  dto: Parameters<
    ReturnType<typeof getAuth>["authControllerForgotPassword"]
  >[0],
): Promise<AuthControllerForgotPasswordResult> {
  return getAuth().authControllerForgotPassword(dto);
}

/**
 * `POST /api/v1/auth/reset-password`
 *
 * Source epic: Epic 2.3 — Forgot-password and reset-password recovery.
 * Source tickets: TKT-2.3.B1, TKT-2.3.A1 (SDK verification).
 *
 * Completes the password-recovery flow using a token from the
 * reset-password email. The response is `201 Created` with a generic
 * `{ message }` body. The backend invalidates ALL active sessions on
 * success; the cross-tab `LOGGED_OUT` broadcast and the local
 * `auth_token` cookie clear are the **caller's** responsibility (see
 * `useResetPassword` in the form layer, TKT-2.3.C5).
 *
 * Anonymous call: no cookie or broadcast side-effects in this module.
 * The hook composes the side-effects because they are a UX concern
 * (the user has to be routed to `/login` after the reset succeeds),
 * not a transport concern.
 */
export async function resetPassword(
  dto: Parameters<
    ReturnType<typeof getAuth>["authControllerResetPassword"]
  >[0],
): Promise<AuthControllerResetPasswordResult> {
  return getAuth().authControllerResetPassword(dto);
}

// ─── OAuth Error Mapper Re-export ──────────────────────────────────────────────

/**
 * Re-export of `mapGoogleLoginError` from the error mapper layer.
 *
 * Source epic: Epic 2.6 — Google sign-in parity.
 * Source ticket: TKT-2.6.T8.
 *
 * Re-exported here so consumers can import the mapper from the service
 * barrel rather than directly from the errors subdirectory. This keeps
 * the import surface consistent: all auth concerns come from `auth.service`.
 *
 * The mapper's input/output contract is documented in `oauth-error-mapper.ts`.
 */
export {
  mapGoogleLoginError,
  type GoogleLoginErrorKind,
  type GoogleLoginErrorResult,
} from "@/features/auth/errors/oauth-error-mapper";
