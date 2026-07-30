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
import type {
  AuthControllerCheckEmailResult,
  AuthControllerCheckUsernameResult,
  AuthControllerForgotPasswordResult,
  AuthControllerLoginResult,
  AuthControllerLogoutResult,
  AuthControllerLogoutAllResult,
  AuthControllerRegisterResult,
  AuthControllerResendVerificationEmailResult,
  AuthControllerResetPasswordResult,
  AuthControllerVerifyEmailResult,
} from "@/lib/api/generated/auth/auth";

/**
 * Notify any open tabs that an auth transition has happened. The
 * `BroadcastChannel('auth')` listener in `src/lib/api/core/custom-instance.ts`
 * uses these same messages to keep cookies, in-flight tokens, and tabs in
 * step. The function is the single seam at which we communicate with the
 * cross-tab subsystem from feature code; feature code MUST NOT post its
 * own messages.
 */
function broadcastAuth(
  payload:
    | { type: "TOKEN_REFRESHED"; accessToken: string; timestamp?: number }
    | { type: "LOGGED_OUT" },
) {
  if (typeof BroadcastChannel === "undefined") return;
  new BroadcastChannel("auth").postMessage(payload);
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
 */
export async function login(
  dto: Parameters<ReturnType<typeof getAuth>["authControllerLogin"]>[0],
): Promise<AuthControllerLoginResult> {
  const data = await getAuth().authControllerLogin(dto);
  setAuthToken(data.data.accessToken);
  broadcastAuth({
    type: "TOKEN_REFRESHED",
    accessToken: data.data.accessToken,
    timestamp: Date.now(),
  });
  return data;
}

/**
 * `POST /api/v1/auth/logout`
 *
 * Always succeeds (idempotent). Clears the local access-token cookie and
 * broadcasts a cross-tab `LOGGED_OUT` event so other tabs redirect to
 * `/login` in lockstep.
 */
export async function logout(): Promise<AuthControllerLogoutResult> {
  try {
    return await getAuth().authControllerLogout();
  } finally {
    clearAuthToken();
    broadcastAuth({ type: "LOGGED_OUT" });
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
    broadcastAuth({ type: "LOGGED_OUT" });
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
