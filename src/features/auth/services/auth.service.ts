/**
 * Auth service — the thin pass-through between feature code and the generated SDK.
 *
 * Source epic: Epic 2.1 — Registration form and availability guidance.
 * Source tickets:
 *   - TKT-2.1.B1 — `checkEmail` / `checkUsername` re-exports.
 *   - TKT-2.1.E2 — `register` / `login` / `logout` / `logoutAll` /
 *     `verifyEmail` / `resendVerificationEmail` re-exports.
 *   - 2.9.T4 — `verifyPassword` / `changePassword` / `revalidateAfterPasswordChange` re-exports.
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
import { clearAuthState } from "@/features/auth/utils/clear-auth-state";
import {
  broadcastAuthEvent,
  type LoggedInEvent,
} from "@/lib/api/core/broadcast-channel";
import { clearVerificationFlags } from "@/features/auth/utils/verification-flag";
import type {
  AuthControllerCheckEmailResult,
  AuthControllerCheckUsernameResult,
  AuthControllerForgotPasswordResult,
  AuthControllerGetActiveSessionsResult,
  AuthControllerGoogleLoginResult,
  AuthControllerLoginResult,
  AuthControllerLogoutResult,
  AuthControllerLogoutAllResult,
  AuthControllerRegisterResult,
  AuthControllerResendVerificationEmailResult,
  AuthControllerResetPasswordResult,
  AuthControllerVerifyEmailResult,
} from "@/lib/api/generated/auth/auth";
import type {
  AccountSecurityDto,
  ChangePasswordDto,
  ChangePasswordResponseDto,
  DeleteAccountDto,
  DeleteAccountResponseDto,
  SessionListResponseDto,
  SessionManagementResultDto,
  VerifyPasswordDto,
  VerifyPasswordResponseDto,
} from "@/lib/api";
import type { LoginResponseDto } from "@/lib/api/generated/schemas/loginResponseDto";
import {
  AuthControllerChangePasswordResult,
  AuthControllerDeleteAccountResult,
  AuthControllerVerifyPasswordResult,
} from "@/lib/api/generated/auth/auth";
import { ApiError } from "@/lib/api/core/ApiError";

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
function broadcastLogin(userId: string, accessToken: string): void {
  const event: Omit<LoggedInEvent, "tabId" | "timestamp"> = {
    type: "LOGGED_IN",
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
  broadcastAuthEvent({ type: "LOGGED_OUT" });
}

/**
 * Broadcast a token refresh event using the centralized channel.
 */
function broadcastTokenRefreshed(accessToken: string): void {
  broadcastAuthEvent({
    type: "TOKEN_REFRESHED",
    accessToken,
  });
}

/**
 * `broadcastAuth` — public re-export of the three internal broadcast helpers.
 *
 * Used by the reset-password flow to broadcast logout after clearing the auth
 * token (so sibling tabs converge on the unauthenticated state). The internal
 * `broadcastLogout` is the canonical implementation; this named export is
 * required so the barrel import in `reset-password/page.tsx` resolves.
 *
 * Source epic:   Phase 8 production-readiness hardening.
 * Source ticket: PROD-A3 — restore missing auth service export.
 */
export function broadcastAuth(event: Parameters<typeof broadcastAuthEvent>[0]): void {
  broadcastAuthEvent(event);
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
  // Source epic: Epic 1.4 — Custom Instance Hardening.
  // Source ticket: TKT-1.4.4.2.
  //
  // The response interceptor in `custom-instance.ts` does NOT
  // unwrap the `{ data, meta }` envelope — the SDK contract
  // (`AuthControllerLoginResult = WrappedDto & { data?:
  // LoginResponseDto }`) and every other read-side call site that
  // reads `result.data` / `response.data.data` directly expect the
  // wrapped shape. We unwrap the inner `LoginResponseDto` here at
  // the transport boundary so the rest of this function can read
  // `accessToken` / `userId` directly.
  const wire = await getAuth().authControllerLogin(dto);
  if (!wire || (wire as { data?: unknown }).data === undefined) {
    throw new Error("Login response missing data envelope");
  }
  const data = (wire as { data: LoginResponseDto }).data;
  const accessToken = data.accessToken;

  setAuthToken(accessToken);

  // Source epic: Epic 2.7 — cross-tab login sync (US-2.7.2).
  // Source ticket: 2.7.T15 — broadcast LOGGED_IN so other tabs can pick up
  // the new session and trigger their bootstrap path.
  //
  // `userId` is on the inner `LoginResponseDto` payload.
  const userId = data.userId ?? "";

  if (userId) {
    broadcastLogin(userId, accessToken);
  }

  // Keep TOKEN_REFRESHED as a fallback message for older listeners that
  // only know how to react to token updates (e.g. background tabs without
  // a mounted AuthBootstrapProvider).
  broadcastTokenRefreshed(accessToken);

  // The static SDK type still claims the wrapped-envelope shape, but
  // the runtime value of `data` is the unwrapped `LoginResponseDto`.
  // The form layer (`submitLogin`) treats the result the same way.
  return data as unknown as AuthControllerLoginResult;
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
  // Same envelope contract as `login()` above — the response
  // interceptor in `custom-instance.ts` does NOT unwrap, so the
  // SDK returns the wrapped envelope and we read `.data` here at
  // the transport boundary. See the TKT-1.4.4.2 doc on `login()`
  // for the long-form explanation.
  const wire = await getAuth().authControllerGoogleLogin({
    idToken,
  });
  if (!wire || (wire as { data?: unknown }).data === undefined) {
    throw new Error("Google login response missing data envelope");
  }
  const data = (wire as { data: LoginResponseDto }).data;
  const accessToken = data.accessToken;

  setAuthToken(accessToken);

  // Source epic: Epic 2.7 — cross-tab login sync (US-2.7.2).
  // Source ticket: 2.7.T15.
  const userId = data.userId ?? "";

  if (userId) {
    broadcastLogin(userId, accessToken);
  }

  // Legacy TOKEN_REFRESHED for older listeners.
  broadcastTokenRefreshed(accessToken);

  // Same envelope cast as `login()`; the static SDK type still
  // claims the wrapped envelope.
  return data as unknown as AuthControllerGoogleLoginResult;
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
    // Phase 4 (TKT-Phase-4 — P1-11): the local cleanup is now
    // delegated to the canonical `clearAuthState()` helper. The
    // helper runs `clearVerificationFlags` + `clearAuthToken` +
    // `clearAllAuthCache` + `broadcastLogout` in the documented
    // order; the helper is fail-open so the cleanup runs even if a
    // primitive throws. The `redirectTo` is intentionally omitted
    // here because `useLogout` / `useLogoutMenu` own the redirect.
    clearAuthState();
  }
}

/**
 * `POST /api/v1/auth/logout-all` — invalidates ALL active sessions.
 *
 * Source epic: Epic 2.8 — Security dashboard and active-session management.
 * Source ticket: 2.8.T6 — verify `logoutAll()` discipline.
 *
 * Identical cookie / broadcast invariant as `logout()`:
 *
 *   - Wrapped in `try { ... } finally { ... }` so the local cleanup
 *     (`clearAuthToken()` + `clearAllAuthCache()` + `LOGGED_OUT`
 *     broadcast) runs on EVERY code path — successful `200`,
 *     thrown `ApiError` (`401`, `5xx`, network), or synchronous
 *     throw.
 *
 *   - Hooks that wrap this function (`useLogoutAll`,
 *     `useLogoutMenu`) MUST NOT clear the cookie or fire the
 *     broadcast themselves. Centralising the side-effect in this
 *     module guarantees every consumer reaches the same finalization
 *     order.
 *
 * The contract is non-negotiable: the backend terminates every
 * session for this user on success, so the user must always reach a
 * public surface (`/login`) regardless of the backend's response.
 */
export async function logoutAll(): Promise<AuthControllerLogoutAllResult> {
  try {
    return await getAuth().authControllerLogoutAll();
  } finally {
    // Phase 4 (TKT-Phase-4 — P1-11): same discipline as `logout()`;
    // delegated to the canonical `clearAuthState()` helper. The
    // broadcast listener in `custom-instance.ts` already wipes the
    // verification flag in sibling tabs; the helper covers THIS
    // tab's pending in-memory state. Order: wipe before
    // `broadcastLogout()` so the receiving tab's listener sees a
    // consistent state.
    clearAuthState();
  }
}

// ─── Session Management SDK Wrappers ──────────────────────────────────────────
//
// Source epic: Epic 2.8 — Security dashboard and active-session management.
// Source tickets: 2.8.T4 (SDK wrappers), 2.8.T5 (current-session helper).
//
// ## Boundary discipline
//
// All four wrappers below are pure forwarders: they call the SDK and
// propagate `ApiError` unchanged, with NO side-effects:
//
//   - They never call `setAuthToken` / `clearAuthToken`.
//   - They never call `clearAllAuthCache` (except `revokeCurrentSession`
//     below, and only on backend success).
//   - They never broadcast `LOGGED_IN` / `LOGGED_OUT`.
//
// Revoking *another* session preserves the caller's session
// (verified against the backend contract per Epic 2.8 verification
// checklist); the SDK wrapper therefore must not touch local state.
// The single exception is `revokeCurrentSession` (2.8.T5), which is
// the only place the "current-session revoked → finalize" path lives.
//
// Errors are propagated to the caller. The session-error mapper
// (`session-error-mapper.ts`, 2.8.T2) classifies them into
// `already_revoked | current_revoked | auth_terminal | conflict |
// retryable`; the hooks read the classification and decide what UI
// to surface.

/**
 * `GET /api/v1/auth/security/dashboard`
 *
 * Returns the security summary (`AccountSecurityDto`) used by the
 * `/settings/security` page. Calling this endpoint never changes
 * auth state — it is a pure read.
 *
 * Two fields on `AccountSecurityDto` are nullable on purpose:
 *
 *   - `lastPasswordChangeAt` — `null` when the password has never
 *     been changed.
 *   - `passwordAgeDays` — `null` when `lastPasswordChangeAt` is
 *     `null`. Derived server-side; never stored.
 *
 * The UI renders the documented "Never changed" / "Not available"
 * fallbacks (see `security-copy.ts`) for those nulls. Never render a
 * numeric `0` for either of them — that would be a value, not a
 * fallback.
 *
 * @throws `ApiError` on any non-2xx response.
 */
export async function getSecurityDashboard(): Promise<AccountSecurityDto> {
  const data = await getAuth().authControllerGetSecurityDashboard();
  if (!data.data) {
    throw ApiError.fromInput({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Security dashboard response missing data envelope",
    });
  }
  return data.data;
}

/**
 * `GET /api/v1/auth/sessions`
 *
 * Returns the list of active sessions (`SessionListResponseDto`).
 * The backend orders rows by most-recent activity first; the
 * `useActiveSessions` hook (2.8.T8) defensively normalises the order
 * but does not re-sort.
 *
 * Exactly one row carries `isCurrentSession: true` — it always
 * references the caller's session. The UI uses that flag both for
 * the "This device" badge and to disable the per-row revoke button
 * on the current session.
 *
 * Missing device fields (`deviceBrowser`, `deviceOs`, `ipAddress`)
 * are the backend's privacy signal — they fall back to
 * `null`. The UI renders the documented "Unknown browser" /
 * "Unknown OS" / "Unknown IP" labels (see `security-copy.ts`).
 *
 * @throws `ApiError` on any non-2xx response.
 */
export async function getActiveSessions(): Promise<SessionListResponseDto> {
  const data: AuthControllerGetActiveSessionsResult =
    await getAuth().authControllerGetActiveSessions();
  if (!data.data) {
    throw ApiError.fromInput({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Active sessions response missing data envelope",
    });
  }
  return data.data;
}

/**
 * `DELETE /api/v1/auth/sessions/others` — revoke every other
 * session, keep the calling session.
 *
 * Per the Epic 2.8 verification checklist, the backend preserves the
 * caller's session. This wrapper therefore MUST NOT touch local auth
 * state — successful other-revokes leave the user still
 * authenticated on this tab.
 *
 * Cross-tab propagation: the backend does not invalidate this
 * session (it does not get deleted), and we never broadcast
 * `LOGGED_OUT` for an other-revoke — the other tabs that were
 * revoked *do* still hold a now-stale access token, but they will
 * learn that on their next `401`, at which point the shared refresh
 * path handles reauthentication cleanly.
 *
 * @throws `ApiError`. The mapper classifies the failure (`conflict`,
 * `retryable`, `auth_terminal`); the caller surfaces a banner.
 */
export async function revokeOtherSessions(): Promise<SessionManagementResultDto> {
  const data = await getAuth().authControllerRevokeOtherSessions();
  return {
    message: (data.data as { message?: string })?.message ?? "",
  };
}

/**
 * `DELETE /api/v1/auth/sessions/:sessionId` — revoke a single session
 * by id.
 *
 * This wrapper is the unconditional "delete by id" call. It does
 * NOT inspect whether the targeted session is the current one. The
 * caller is responsible for routing through:
 *
 *   - `useRevokeSession` (2.8.T17) for the row-level revoke, which
 *     optimistically removes the row and routes the response through
 *     the session-error mapper; OR
 *   - `revokeCurrentSession()` (2.8.T5) when the caller *knows* it
 *     is revoking the current session (the only path that runs the
 *     logout finalization).
 *
 * Per Epic 2.8 verification: revoking another session does NOT clear
 * the caller's refresh cookie; revoking the current session *does*.
 * Both branches preserve the caller's session when the target is
 * someone else; both branches must therefore avoid the finalization
 * path on their own. `revokeCurrentSession` is the only entry-point
 * that runs it.
 *
 * @param sessionId - The opaque session UUID. Passed verbatim.
 * @throws `ApiError` on any non-2xx response.
 */
export async function revokeSession(
  sessionId: string,
): Promise<SessionManagementResultDto> {
  const data = await getAuth().authControllerRevokeSession(sessionId);
  return {
    message: (data.data as { message?: string })?.message ?? "",
  };
}

/**
 * Result of `revokeCurrentSession()`. Mirrors the `logout()` /
 * `logoutAll()` discipline: the discriminated union lets the caller
 * branch on success-vs-error without try/catch gymnastics.
 */
export type RevokeCurrentSessionResult =
  | { kind: "success"; message: string }
  | { kind: "error"; error: ApiError };

/**
 * Revoke the caller's own session and run the shared logout
 * finalization only on backend success.
 *
 * Source epic: Epic 2.8 — Security dashboard and active-session management.
 * Source ticket: 2.8.T5 (initial), 2.8.T23 (cross-tab broadcast confirmation).
 *
 * This helper is the SINGLE place that combines `revokeSession` with
 * the logout finalization path. It exists for one reason: revoking
 * your own session via the active-sessions list must behave like
 * `logout()` — the local cookie/cache/broadcast cleanup runs on
 * backend success.
 *
 * ## Discipline (mirrors `logout()`, TKT-2.4.B1)
 *
 *   1. The SDK call runs FIRST. No cookie is cleared before the
 *      backend confirms. The token remains valid until expiry
 *      anyway; clearing it early would only matter if the backend
 *      *refused* the revoke, in which case the user's local state
 *      is still consistent.
 *
 *   2. On backend `2xx`:
 *
 *        - `clearAuthToken()`          — drop the access-token cookie.
 *        - `clearAllAuthCache()`       — drop identity/profile cache.
 *        - `broadcastLogout()`         — fire `LOGGED_OUT` via the
 *          centralized `broadcastAuthEvent({ type: 'LOGGED_OUT' })`
 *          channel. Other tabs receive the broadcast, run
 *          `clearAuthToken` + `markLogout('remote')`, and redirect
 *          to `/login` via the listener in `custom-instance.ts`.
 *          The same-tab filter (by `tabId`) prevents the originating
 *          tab from re-receiving its own broadcast, so the
 *          same-tab redirect is handled by the hook's
 *          `router.push('/login')` after this function resolves.
 *
 *   3. On backend error: NONE of the above runs. The caller decides
 *      what to surface based on the session-error mapper output
 *      (`auth_terminal | conflict | retryable`).
 *
 *   4. Hooks MUST NOT call `clearAuthToken` / `clearAllAuthCache` /
 *      `broadcastLogout` themselves; doing so duplicates the cleanup
 *      and races against the broadcast ordering. The
 *      `useRevokeSession` hook (2.8.T17) is the only consumer and it
 *      branches on `result.kind` instead of doing its own cleanup.
 *
 *   5. **Cross-tab contract (T23):** the same-tab filter on the
 *      listener (Epic 2.7 / `broadcast-channel.ts`) ensures this
 *      tab does NOT receive its own broadcast, so no infinite
 *      redirect loop is possible. Other tabs converge via the
 *      listener's `LOGGED_OUT` handler (which already runs
 *      `clearAuthToken`, `markLogout('remote')`, and
 *      `window.location.href = '/login'`).
 *
 * @param sessionId - The opaque session UUID of the caller's own session.
 * @returns `{ kind: 'success', message } | { kind: 'error', error }`.
 *          The caller MUST branch on `kind` and MUST NOT inspect
 *          the `ApiError` directly for routing.
 *
 * @example
 * ```typescript
 * const result = await revokeCurrentSession(currentSessionId);
 * if (result.kind === 'success') {
 *   router.push('/login');
 * } else {
 *   // The session-error mapper has already classified; the hook
 *   // surfaces the right banner. Nothing to do here.
 * }
 * ```
 */
export async function revokeCurrentSession(
  sessionId: string,
): Promise<RevokeCurrentSessionResult> {
  try {
    const data = await getAuth().authControllerRevokeSession(sessionId);
    const message = (data.data as { message?: string })?.message ?? "";
    // Finalize ONLY on backend success. Mirrors `logout()` discipline.
    //
    // Cross-tab broadcast (2.8.T23): the LOGGED_OUT event fires via
    // the centralized broadcastAuthEvent so other tabs converge
    // (clearAuthToken + redirect to /login) via the listener in
    // custom-instance.ts. The same-tab filter on `tabId` prevents
    // this tab from re-receiving its own broadcast; the hook handles
    // the same-tab redirect via `router.push('/login')` after this
    // resolves.
    //
    // Epic 2.9 / 2.9.T10 — wipe any in-memory "recently verified"
    // flags BEFORE broadcasting, so the receiving tab's listener
    // sees consistent state.
    clearVerificationFlags();
    clearAuthToken();
    clearAllAuthCache();
    broadcastAuthEvent({ type: "LOGGED_OUT" });
    return { kind: "success", message };
  } catch (error) {
    const err =
      error instanceof ApiError
        ? error
        : ApiError.fromInput({
            status: 0,
            code: "GLOBAL_INTERNAL_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Unknown error revoking current session",
          });
    return { kind: "error", error: err };
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
  dto: Parameters<ReturnType<typeof getAuth>["authControllerResetPassword"]>[0],
): Promise<AuthControllerResetPasswordResult> {
  return getAuth().authControllerResetPassword(dto);
}

// ─── Password Management SDK Wrappers ────────────────────────────────────────
//
// Source epic: Epic 2.9 — Password re-verification and password change.
// Source tickets: 2.9.T4 (SDK wrappers), 2.9.T5 (revalidation helper).
//
// ## Boundary discipline
//
// Both wrappers below are pure forwarders: they call the SDK and
// propagate `ApiError` unchanged, with NO side-effects:
//
//   - They never call `setAuthToken` / `clearAuthToken`.
//   - They never call `clearAllAuthCache`.
//   - They never broadcast `LOGGED_IN` / `LOGGED_OUT`.
//
// `verifyPassword` proves password knowledge but does not change
// auth state — the backend contract is "verify returns
// VerifyPasswordResponseDto, no token, no cookie, no new session".
// The frontend must not present the verification response as a
// reusable server authorization credential.
//
// `changePassword` preserves the current session on success and
// revokes every other session. The local `auth_token` cookie
// remains valid; the SDK wrapper therefore does not touch local
// state. The hook layer (`useChangePassword`, 2.9.T7) is
// responsible for revalidating the security dashboard and
// session list so the UI reflects the new state.
//
// Errors are propagated to the caller. The password-error mapper
// (`password-error-mapper.ts`, 2.9.T2) classifies them into
// `invalid_current | reuse | validation | auth_terminal | conflict
// | retryable`; the hooks read the classification and decide what
// UI to surface.

/**
 * `POST /api/v1/auth/verify-password`
 *
 * Source epic: Epic 2.9 — Password re-verification and password change.
 * Source ticket: 2.9.T4.
 *
 * Verifies the authenticated user's current password WITHOUT issuing
 * tokens or sessions. Intended as a confirmation step before
 * sensitive operations (e.g. opening the change-password card).
 *
 * ## Backend contract
 *
 * The response shape is `VerifyPasswordResponseDto` (`{ valid:
 * boolean }`):
 *
 *   - `valid: true`  — the password matched the current account.
 *   - `valid: false` — the backend still returns 200 with this
 *     body; the UI must read the `valid` boolean, not the HTTP
 *     status. The mapper does not see this path — `verify-password`
 *     does not throw on a wrong password.
 *
 * If the user is unauthenticated the backend returns 401
 * (`AUTH_INVALID_TOKEN`); the wrapper propagates the `ApiError`
 * unchanged so the hook can route through `mapPasswordError`.
 *
 * ## Side-effect ownership
 *
 * This wrapper does NOT touch cookies, broadcasts, or cache. The
 * verification step is local to the user already in the session;
 * setting or clearing an `auth_token` cookie would change auth
 * state and the backend explicitly does not authorize that here.
 *
 * Errors are propagated to the caller. The hook
 * (`useVerifyPassword`, 2.9.T6) routes through
 * `mapPasswordError(...)` for the `'invalid_current'` /
 * `'retryable'` / `'auth_terminal'` branches.
 *
 * @param dto - The `VerifyPasswordDto` (`{ password: string }`)
 * @returns `VerifyPasswordResponseDto` (`{ valid: boolean }`)
 * @throws `ApiError` on any non-2xx response (network failure,
 *         401, 429, 5xx). The hook layer is responsible for
 *         routing the failure through `mapPasswordError`.
 */
export async function verifyPassword(
  dto: VerifyPasswordDto,
): Promise<VerifyPasswordResponseDto> {
  const data: AuthControllerVerifyPasswordResult =
    await getAuth().authControllerVerifyPassword(dto);
  if (!data.data) {
    throw ApiError.fromInput({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Verify password response missing data envelope",
    });
  }
  return data.data;
}

/**
 * `POST /api/v1/auth/change-password`
 *
 * Source epic: Epic 2.9 — Password re-verification and password change.
 * Source ticket: 2.9.T4.
 *
 * Changes the account password for an authenticated user. Requires
 * the current password and terminates every other active session.
 *
 * ## Backend contract
 *
 * The response shape on success is `ChangePasswordResponseDto`
 * (`{ message: string }`). Notable status codes:
 *
 *   - `201` — password changed; current session preserved; other
 *     sessions revoked.
 *   - `401 AUTH_INVALID_CURRENT_PASSWORD` — `currentPassword` does
 *     not match. Field-level error on the current-password field.
 *   - `409 AUTH_PASSWORD_REUSE` — the new password matches a
 *     recent value in the user's password history. Field-level
 *     error on the new-password field.
 *   - `400 GLOBAL_VALIDATION_FAILED` — the new password failed
 *     server-side `class-validator` rules (e.g. minimum length,
 *     complexity) the client-side `password-strength.ts` did not
 *     catch. Per-field messages are in `validationMessages`.
 *
 * ## Side-effect ownership
 *
 * This wrapper does NOT call `setAuthToken`, `clearAuthToken`,
 * `clearAllAuthCache`, or `broadcastLogout`. The backend contract
 * is "successful change preserves the current session" — the
 * local `auth_token` cookie remains valid. The frontend's job is
 * to revalidate the security dashboard and the active-sessions
 * list through `revalidateAfterPasswordChange()` (T5) so the UI
 * reflects the new state (only the current session remains;
 * `passwordAgeDays` and `lastPasswordChangeAt` are updated).
 *
 * Errors are propagated to the caller. The hook
 * (`useChangePassword`, 2.9.T7) routes through
 * `mapPasswordError(...)` for the `'invalid_current' | 'reuse' |
 * 'validation' | 'auth_terminal' | 'conflict' | 'retryable'`
 * branches.
 *
 * @param dto - The `ChangePasswordDto` (`{ currentPassword: string;
 *              newPassword: string }`)
 * @returns `ChangePasswordResponseDto` (`{ message: string }`)
 * @throws `ApiError` on any non-2xx response. The hook layer is
 *         responsible for routing the failure through
 *         `mapPasswordError`.
 */
export async function changePassword(
  dto: ChangePasswordDto,
): Promise<ChangePasswordResponseDto> {
  const data: AuthControllerChangePasswordResult =
    await getAuth().authControllerChangePassword(dto);
  if (!data.data) {
    throw ApiError.fromInput({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Change password response missing data envelope",
    });
  }
  return data.data;
}

/**
 * `revalidateAfterPasswordChange()` — re-read the security
 * dashboard and active-sessions list after a successful password
 * change.
 *
 * Source epic: Epic 2.9 — Password re-verification and password change.
 * Source ticket: 2.9.T5.
 *
 * ## Purpose
 *
 * The backend preserves the current session on a successful change
 * but revokes every other one. The frontend must reflect the new
 * state without touching local auth state — the local `auth_token`
 * cookie is still valid. This helper is the single place the
 * post-change revalidation lives, mirroring the discipline
 * `revokeCurrentSession()` (2.8.T5) has.
 *
 * ## Parallel reads
 *
 * The two reads run in parallel via `Promise.all` so the UI sees
 * the updated dashboard and list at the same time. If either read
 * rejects, the helper rejects with the first error — partial
 * failure surfaces the original error, and the caller's UI can
 * retry (the success banner is NOT rolled back: the password
 * change itself succeeded).
 *
 * ## Side-effect ownership
 *
 * This helper does NOT call `setAuthToken`, `clearAuthToken`,
 * `clearAllAuthCache`, or `broadcastLogout`. The backend contract
 * is "successful change preserves the current session" — the
 * local `auth_token` cookie remains valid. The two reads are
 * pure fetches.
 *
 * @returns `{ dashboard, sessions }` — both `AccountSecurityDto`
 *          and `SessionListResponseDto` ready for the hook to
 *          hand off to the dashboard / sessions hooks.
 * @throws `ApiError` on the first read that rejects. The caller
 *         may retry by calling the helper again.
 *
 * @example
 * ```typescript
 * const result = await changePassword({ currentPassword, newPassword });
 * const { dashboard, sessions } = await revalidateAfterPasswordChange();
 * dashboardRefetch(dashboard);
 * sessionsRefetch(sessions);
 * ```
 */
export async function revalidateAfterPasswordChange(): Promise<{
  dashboard: AccountSecurityDto;
  sessions: SessionListResponseDto;
}> {
  const [dashboard, sessions] = await Promise.all([
    getSecurityDashboard(),
    getActiveSessions(),
  ]);
  return { dashboard, sessions };
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

// ─── Session Error Mapper / Codes Re-export ────────────────────────────────────
//
// Source epic: Epic 2.8 — Security dashboard and active-session management.
// Source tickets: 2.8.T1 (codes), 2.8.T2 (mapper).
//
// Re-exported here so callers import session-error types from the
// service barrel (`auth.service`) rather than reaching into the
// errors subdirectory. Same convention as the OAuth mapper above.

export {
  mapSessionError,
  isAlreadyRevoked,
  isCurrentRevoked,
  isAuthTerminalSessionError,
  isSessionErrorRetryable,
  isSessionConflict,
  type SessionErrorTarget,
  type SessionErrorClassification,
  type SessionErrorInput,
} from "@/features/auth/errors/session-error-mapper";

export {
  AUTH_SESSION_NOT_FOUND,
  AUTH_INVALID_TOKEN,
  AUTH_RESOURCE_CONFLICT,
  isSessionNotFoundError,
  isSessionErrorCode,
  isSessionRecoverableStatus,
  type SessionErrorCode,
} from "@/features/auth/errors/session-error-codes";

// ─── Security Copy Registry Re-export ──────────────────────────────────────────
//
// Source epic: Epic 2.8.
// Source ticket: 2.8.T3.
//
// Re-exported so the Security view (planned at 2.8.T9 / 2.8.T12) can
// pull every visible string from `auth.service` rather than the
// copy subdirectory.

export {
  COPY_KEYS as SECURITY_COPY_KEYS,
  resolveCopy as resolveSecurityCopy,
  passwordAgeUnknownSnapshot,
  sessionListEmptySnapshot,
  lastPasswordChangeUnknownSnapshot,
} from "@/features/auth/copy/security-copy";

// ─── Password Error Mapper / Codes Re-export ──────────────────────────────────
//
// Source epic: Epic 2.9 — Password re-verification and password change.
// Source tickets: 2.9.T1 (codes), 2.9.T2 (mapper), 2.9.T3 (copy).
//
// Re-exported here so the verify-password modal and the
// change-password card (planned at 2.9.T9 / 2.9.T11) can pull
// every error-mapping type and copy key from `auth.service` rather
// than reaching into the errors / copy subdirectories. Same
// convention as the Session and OAuth mappers above.

export {
  mapPasswordError,
  isInvalidCurrentPassword,
  isPasswordReuse,
  isPasswordValidation,
  isAuthTerminalPasswordError,
  isPasswordConflict,
  isPasswordErrorRetryable,
  type PasswordErrorClassification,
  type PasswordErrorInput,
} from "@/features/auth/errors/password-error-mapper";

export {
  AUTH_INVALID_CURRENT_PASSWORD,
  AUTH_PASSWORD_REUSE,
  // Re-use the session codes for `AUTH_INVALID_TOKEN` and
  // `AUTH_RESOURCE_CONFLICT` — they are already exported from the
  // session-error-codes re-export above, and re-exporting them
  // here would collide with that re-export. Callers should import
  // these two codes from the session-error-codes re-export point.
  GLOBAL_VALIDATION_FAILED,
  isInvalidCurrentPasswordError,
  isPasswordReuseError,
  isPasswordErrorCode,
  isPasswordRecoverableStatus,
  type PasswordErrorCode,
} from "@/features/auth/errors/password-error-codes";

export {
  COPY_KEYS as PASSWORD_COPY_KEYS,
  resolveCopy as resolvePasswordCopy,
  verifyInvalidCurrentSnapshot,
  passwordTooWeakSnapshot,
  passwordChangeSuccessSnapshot,
  hasPasswordCopyKey,
} from "@/features/auth/copy/password-copy";

// ─── Account Deletion ────────────────────────────────────────────────────────
//
// Source epic: Epic 2.10 — Permanent account deletion.
// Source tickets: 2.10.T5 (deleteAccount), 2.10.T6 (verifyPassword reuse),
// 2.10.T7 (deletion success boundary).
//
// The deletion flow is intentionally non-trivial: a successful delete
// is terminal and the backend invalidates every active session and
// clears the refresh-token cookie atomically. Therefore:
//
//   - The deletion wrappers are pure SDK forwarders (T5, T6).
//     They do NOT call `setAuthToken`, `clearAuthToken`,
//     `broadcastLogout`, or `clearAllAuthCache`. The backend owns
//     session invalidation; the frontend owns local cleanup, which
//     lives behind `runDeletionFinalization()` (T7) and runs only
//     after the service-level result contract proves the request
//     succeeded.
//
//   - The success boundary (T7) is the single place that distinguishes
//     "the backend committed deletion" from "the user is signed out
//     locally". It does NOT issue a `logout` / `logoutAll` request;
//     the backend's contract guarantees session termination.

/**
 * `DELETE /api/v1/auth/account`
 *
 * Source epic: Epic 2.10 — Permanent account deletion.
 * Source ticket: 2.10.T5.
 *
 * Permanently deletes the authenticated user's account after password
 * confirmation. The backend contract:
 *
 *   - requires a Bearer access token (this function does not handle
 *     token refresh; the axios interceptor owns it, but the endpoint
 *     is in `AUTH_PATHS` so a 401 will NOT trigger a silent refresh),
 *   - requires `DeleteAccountDto.password` (the current password,
 *     minimum length 1, maximum 128 — see the generated DTO),
 *   - on success returns `DeleteAccountResponseDto` and atomically
 *     invalidates every active session and clears the refresh-token
 *     cookie,
 *   - on wrong password returns `AUTH_INVALID_CURRENT_PASSWORD`
 *     without modifying the account,
 *   - on concurrent / already-deleted returns `AUTH_DELETION_FAILED`,
 *   - on stale token returns `AUTH_INVALID_TOKEN`.
 *
 * ## Side-effect ownership
 *
 * This function is a pure SDK forwarder. It does NOT:
 *
 *   - call `setAuthToken` / `clearAuthToken`,
 *   - call `broadcastLogout` / `broadcastTokenRefreshed`,
 *   - call `clearAllAuthCache`,
 *   - navigate, mutate history, or redirect.
 *
 * The hook layer (`useDeleteAccount`, 2.10.T12) is responsible for
 * detecting authoritative success and running local cleanup via
 * `runDeletionFinalization()` (2.10.T7). Issuing a logout request
 * against a deleted account is a documented anti-pattern: the
 * backend has already invalidated every session, and any logout
 * attempt could race with the deletion commit.
 *
 * ## Password hygiene
 *
 * The `password` argument goes out of scope when this function
 * returns. The wrapper does not capture the value in any closure,
 * module-level state, or log payload. The hook layer must not store
 * the password in React state beyond the synchronous call.
 *
 * @param dto - The `DeleteAccountDto` (`{ password: string }`)
 * @returns `DeleteAccountResponseDto` (`{ message: string }`)
 * @throws `ApiError` on any non-2xx response. The hook layer is
 *         responsible for routing the failure through
 *         `mapDeletionError`.
 */
export async function deleteAccount(
  dto: DeleteAccountDto,
): Promise<DeleteAccountResponseDto> {
  const data: AuthControllerDeleteAccountResult =
    await getAuth().authControllerDeleteAccount(dto);
  if (!data.data) {
    throw ApiError.fromInput({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Delete account response missing data envelope",
    });
  }
  return data.data;
}

// ─── Account Deletion — Optional Verify-Password Wrapper ─────────────────────
//
// Source epic: Epic 2.10 — Permanent account deletion.
// Source ticket: 2.10.T6.
//
// The Epic 2.10 design allows the destructive modal to optionally
// re-prompt with `POST /auth/verify-password` BEFORE the
// `DELETE /auth/account` call. This is a UX nicety — the `DELETE`
// call still requires the current password in its body, so the
// verify-password result cannot replace the proof.
//
// To avoid duplicating Epic 2.9's verify-password implementation
// (2.9.T4), we re-export the existing `verifyPassword()` wrapper
// here so deletion flows can consume it without importing the
// password-management service surface directly.
//
// ## What this re-export guarantees
//
//   - The underlying `authControllerVerifyPassword` call is the same
//     function Epic 2.9 uses. There is NO alternate "deletion-grade"
//     verification path.
//   - A successful verify-password call MUST NOT cause the deletion
//     hook to skip the password field in the destructive modal. The
//     `DeleteAccountDto.password` body field remains mandatory.
//   - The wrapper returns `{ valid: boolean }` (no tokens, no
//     cookies, no broadcasts). It is a pure forwarder.

export { verifyPassword as verifyPasswordForDeletion };

// ─── Account Deletion — Error Mapper / Codes Re-export ───────────────────────
//
// Source epic: Epic 2.10.
// Source tickets: 2.10.T2 (codes), 2.10.T3 (mapper).
//
// Re-exported here so the destructive deletion modal and hook
// (planned at 2.10.T15 / 2.10.T12) can pull every error-mapping
// type and code from `auth.service` rather than reaching into the
// errors subdirectory. Same convention as the Session and Password
// re-exports above.

export {
  mapDeletionError,
  isInvalidCurrentPasswordDeletion,
  isDeletionConflict,
  isDeletionNotFound,
  isAuthTerminalDeletionError,
  isDeletionValidation,
  isDeletionUncertain,
  type DeletionErrorClassification,
  type DeletionErrorInput,
} from "@/features/auth/errors/deletion-error-mapper";

export {
  AUTH_DELETION_FAILED,
  // AUTH_INVALID_CURRENT_PASSWORD, AUTH_INVALID_TOKEN,
  // AUTH_RESOURCE_CONFLICT, and GLOBAL_VALIDATION_FAILED are already
  // exported from the session and password error-codes re-exports
  // above — re-exporting them here would collide.
  USER_NOT_FOUND,
  isInvalidCurrentPasswordError as isInvalidCurrentPasswordDeletionCode,
  isDeletionFailedError,
  isUserNotFoundError,
  isDeletionErrorCode,
  isDeletionRecoverableStatus,
  type DeletionErrorCode,
} from "@/features/auth/errors/deletion-error-codes";

// ─── Account Deletion — Copy Registry Re-export ──────────────────────────────
//
// Source epic: Epic 2.10.
// Source ticket: 2.10.T4.

export {
  COPY_KEYS as DELETION_COPY_KEYS,
  resolveCopy as resolveDeletionCopy,
  deletionConfirmTitleSnapshot,
  deletionConsequenceSnapshot,
  deletionUncertainSnapshot,
  hasDeletionCopyKey,
} from "@/features/auth/copy/deletion-copy";

// ─── Account Deletion — Finalization Coordinator Re-export ───────────────────
//
// Source epic: Epic 2.10.
// Source tickets: 2.10.T7 (initial success boundary), 2.10.T14
// (coordinator refactor — composes the T9–T11 cleanup primitives).
//
// Re-exported here so the deletion hook (2.10.T12) and the cross-tab
// receiver (2.10.T24) can import the finalization entry point from
// the auth service barrel. The coordinator itself lives in
// `@/features/auth/lifecycle/deletion-finalization.ts`.

export {
  runDeletionFinalization,
  isDeletionFinalized,
  resetDeletionFinalizationForTesting,
  type DeletionFinalizationResult,
  type DeletionCleanupStep,
} from "@/features/auth/lifecycle/deletion-finalization";

// ─── Account Deletion — Cleanup Primitives (T9–T11) ──────────────────────────
//
// Source epic: Epic 2.10.
// Source tickets: 2.10.T9 (auth-marker cleanup), 2.10.T10 (cache
// cleanup), 2.10.T11 (persisted state + form-state cleanup).
//
// Each primitive has a single responsibility. The deletion
// coordinator composes them; the hook layer can call them
// independently for fine-grained tests or alternative integration
// paths. They are re-exported through the auth service barrel so
// feature code has a single import surface.

export { finalizeDeletedAccountAuthMarkers } from "@/features/auth/lifecycle/deletion-auth-markers";

export {
  clearAllDeletionCaches,
  type DeletionCacheCleanupReport,
} from "@/features/auth/lifecycle/deletion-cache-cleanup";

export {
  AUTH_PERSISTENT_KEYS,
  clearPersistedUserStore,
  clearDeletionPersistedAccountState,
  clearSensitiveDeletionFormValues,
  type DeletionFormSetters,
} from "@/features/auth/lifecycle/deletion-persisted-state";

// ─── Account Deletion — Revalidation Helper (T13) ────────────────────────────
//
// Source epic: Epic 2.10.
// Source ticket: 2.10.T13.
//
// Re-exported so the deletion hook (`useDeleteAccount`) and any
// future revalidation CTA can import the helper from the auth
// service barrel without reaching into the lifecycle subdirectory.

export {
  revalidateAccountExists,
  type DeletionAccountExistence,
  type DeletionRevalidationResult,
  type RevalidateAccountExistsDeps,
} from "@/features/auth/lifecycle/deletion-revalidation";

// ─── Account Deletion — History Replacement (T20) ───────────────────────────
//
// Source epic: Epic 2.10.
// Source ticket: 2.10.T20.
//
// Re-exported so the settings page (2.10.T18) and any future
// deletion-aware navigation helper can import the
// `buildDeletionReplaceHistory()` thunk from the auth service
// barrel without reaching into the lifecycle subdirectory.

export {
  buildDeletionReplaceHistory,
  DELETION_PUBLIC_LANDING_PATH,
} from "@/features/auth/lifecycle/deletion-history";

// ─── Account Deletion — Protected-Route Guard (T21) ─────────────────────────
//
// Source epic: Epic 2.10.
// Source ticket: 2.10.T21.
//
// Re-exported so protected surfaces (the settings layout and
// future shared layouts) can wrap their children with
// `<DeletionGuard>` without reaching into the guards subdirectory.

export {
  DeletionGuard,
  useDeletionGuardActive,
  type DeletionGuardProps,
} from "@/features/auth/guards/deletion-guard";

// ─── Account Deletion — Lifecycle State Model (T8) ────────────────────────────
//
// Source epic: Epic 2.10.
// Source ticket: 2.10.T8.
//
// Re-exported so feature code (modal, hook, tests) can pull the
// discriminated-union types from the auth service barrel.

export {
  initialDeletionState,
  assertNeverExhaustiveDeletionState,
  isTerminalDeletionState,
  type DeletionState,
  type DeletionIdleState,
  type DeletionPendingState,
  type DeletionUncertainState,
  type DeletionCleanupState,
  type DeletionCompletedState,
  type DeletionStateError,
} from "@/features/auth/types/deletion-state";

// ─── Account Deletion — Hook (T12) ────────────────────────────────────────────
//
// Source epic: Epic 2.10.
// Source ticket: 2.10.T12.
//
// Re-exported so the modal component imports the hook through the
// auth service barrel, matching the discipline used by
// `useVerifyPassword`, `useRevokeSession`, `useLogout`, etc.

export {
  useDeleteAccount,
  DELETION_INTENT_TOKEN,
  type UseDeleteAccountDeps,
  type UseDeleteAccountResult,
  type UseDeleteAccountSubmitResult,
} from "@/features/auth/hooks/use-delete-account";

// ─── Account Deletion — Cross-Tab Channel Event (T22) ────────────────────────
//
// Source epic: Epic 2.10.
// Source ticket: 2.10.T22.
//
// Re-exported so feature code can publish the deletion terminal
// event from outside the auth service (e.g. directly from a test
// harness or a manual repair flow) without reaching into the
// core transport layer.

export { broadcastAccountDeleted } from "@/lib/api/core/broadcast-channel";

// ─── Account Deletion — Refresh Suppression Marker (T23) ─────────────────────
//
// Source epic: Epic 2.10.
// Source ticket: 2.10.T23.
//
// Re-exported so the deletion hook (2.10.T12) and the cross-tab
// receiver (2.10.T24) can both read the terminal state via a
// single import surface. The underlying implementation lives in
// `deletion-terminal.ts` so the lifecycle modules do not depend
// on `custom-instance.ts`.

export {
  isDeletionTerminal,
  markDeletionTerminal,
  clearDeletionTerminal,
  _isDeletionTerminalForTesting,
} from "@/features/auth/lifecycle/deletion-terminal";

// ─── Account Deletion — Cross-Tab Receiver (T24) ──────────────────────────────
//
// Source epic: Epic 2.10.
// Source ticket: 2.10.T24.
//
// Re-exported so the cross-tab listener (wired in
// `custom-instance.ts`) can dispatch the receiver through the
// auth service barrel. Tests can call `handleRemoteAccountDeleted`
// directly to simulate a sibling tab's deletion event without
// touching the BroadcastChannel.

export { handleRemoteAccountDeleted } from "@/features/auth/lifecycle/deletion-cross-tab";
