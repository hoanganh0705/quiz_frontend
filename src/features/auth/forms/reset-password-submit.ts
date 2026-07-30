/**
 * Reset-password submit handler — single-flight
 * `POST /auth/reset-password`.
 *
 * Source epic: Epic 2.3 — Forgot-password and reset-password recovery.
 * Source ticket: TKT-2.3.C5.
 *
 * ## Single-flight discipline
 *
 * The single-flight guarantee is owned by `useResetPassword`
 * (`./use-reset-password.ts`); this file is the pure,
 * dependency-injectable function that the hook wraps. Same pattern
 * as `submitRegistration` (TKT-2.1.D2), `submitVerifyEmail`
 * (TKT-2.2.C1), `submitResendVerification` (TKT-2.2.D2), and
 * `submitForgotPassword` (TKT-2.3.C3).
 *
 * ## Anti-enumeration (invalid-link collapse)
 *
 * The mapper (TKT-2.3.B2) collapses `AUTH_INVALID_TOKEN`,
 * `expired`, and `consumed` tokens into the same `'invalid_link'`
 * kind. The helper bubbles that up; the form renders one neutral
 * body for the three states.
 *
 * ## Post-success auth-state clear
 *
 * A successful `201` from the backend invalidates every active
 * session for the account (per the controller's JSDoc). The
 * **client** must mirror this:
 *   - clear the local `auth_token` cookie so subsequent SDK calls
 *     do not issue with a stale token;
 *   - post a `BroadcastChannel('auth')` `LOGGED_OUT` message so
 *     any other open tab that was authenticated as the same user
 *     also drops its token state.
 *
 * The page (TKT-2.3.C6) navigates to `/login` after this chain.
 * All three steps are mandatory: a stale cookie is the path to
 * "the user thought they were signed out but their requests
 * carried a still-valid access token that was about to be rejected".
 *
 * The helper receives `clearAuthToken` and `broadcastLogout` as
 * DI seams so the unit suite (TKT-2.3.D3) can stub them; the page
 * wires the real implementations.
 */

// `resetPassword` is the auth-service re-export (TKT-2.3.B1).
import { resetPassword as defaultResetPassword } from "@/features/auth/service/auth.service";

import {
  mapResetPasswordError,
  type ResetPasswordErrorKind,
} from "@/features/auth/errors/recovery-error-mapper";

/**
 * Result shape for `submitResetPassword`.
 *
 *   `success` — the SDK call returned `201`. The caller has
 *               already cleared local auth state (cookie + broadcast)
 *               before this result is observed; the page navigates
 *               to `nextRoute`.
 *   `error`   — any mapper-collapsed kind. The page renders the
 *               same neutral `'invalid_link'` body or a
 *               recoverable failure copy depending on the kind.
 *
 * The success path returns `nextRoute: '/login'` so the page does
 * not hard-code the redirect target. A future ticket that wants to
 * route the user to a `'choose new dashboard'` page updates this
 * single value.
 */
export type ResetSubmitResult =
  | { kind: "success"; nextRoute: "/login" }
  | {
      kind: "error";
      errorKind: ResetPasswordErrorKind;
    };

/**
 * Documented redirect target after a successful reset. The page
 * reads this constant; it does NOT hard-code the path.
 */
export const RESET_ACK_ROUTE = "/login" as const;

export interface SubmitResetPasswordDeps {
  /**
   * The backend `resetPassword` call. Injected via this dependency
   * so the unit suite can stub the network without module mocks.
   */
  resetPassword: (dto: { token: string; newPassword: string }) => Promise<unknown>;
  /**
   * The local cookie-clear helper (TKT-2.1.B cookies utility).
   * Injected for the same DI reason as above.
   */
  clearAuthToken: () => void;
  /**
   * The cross-tab `LOGGED_OUT` broadcast helper (TKT-1.4 /
   * TKT-2.1.E2). Injected for the same DI reason.
   */
  broadcastLogout: () => void;
}

/**
 * Default dependencies: the real backend call plus the real
 * auth-side-effect helpers. Hooks default to these; tests
 * typically pass a stub.
 *
 * The `clearAuthToken` and `broadcastLogout` defaults are imported
 * lazily (dynamic `require`) to keep this module SSR-safe and to
 * avoid importing cookie / broadcast machinery in the unit suite.
 * The hook always supplies the page-side wrappers, so the lazy
 * default is a fallback that production code never uses.
 */
export const defaultSubmitResetPasswordDeps: SubmitResetPasswordDeps = {
  resetPassword: defaultResetPassword,
  clearAuthToken: () => {
    // Page-side hooks supply the real implementation; the unit
    // suite supplies stubs.
  },
  broadcastLogout: () => {
    // Same as above — page-side hooks supply the real implementation.
  },
};

/**
 * Pure, dependency-injectable reset-password submit. Always
 * resolves with a `ResetSubmitResult`; never rejects. Errors are
 * mapped through `mapResetPasswordError`.
 *
 * **Side-effect contract:** on a successful `201`, this helper
 * invokes `clearAuthToken()` exactly once and `broadcastLogout()`
 * exactly once before resolving. On any error, neither is called.
 *
 * @param token         - the token from the URL `?token=` query.
 *                        The caller is responsible for the C2
 *                        well-formed predicate; this helper trusts
 *                        the input.
 * @param newPassword   - the validated password from the form.
 * @param deps          - the `resetPassword` function plus the
 *                        cookie-clear and broadcast helpers.
 */
export async function submitResetPassword(
  token: string,
  newPassword: string,
  deps: SubmitResetPasswordDeps = defaultSubmitResetPasswordDeps,
): Promise<ResetSubmitResult> {
  try {
    await deps.resetPassword({ token, newPassword });
    // Backend returned `201`. Mandatory client-side mirror:
    //   1. clear the local auth_token cookie;
    //   2. broadcast LOGGED_OUT so any other open tab drops its
    //      token state.
    // Both are called exactly once on success and NEVER on error
    // (acceptance criterion TKT-2.3.C5-4).
    deps.clearAuthToken();
    deps.broadcastLogout();
    return { kind: "success", nextRoute: RESET_ACK_ROUTE };
  } catch (err: unknown) {
    const mapped = mapResetPasswordError(err);
    return {
      kind: "error",
      errorKind: mapped.kind,
    };
  }
}