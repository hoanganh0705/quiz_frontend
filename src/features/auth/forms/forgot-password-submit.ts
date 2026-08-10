/**
 * Forgot-password submit handler — single-flight
 * `POST /auth/forgot-password`.
 *
 * Source epic: Epic 2.3 — Forgot-password and reset-password recovery.
 * Source ticket: TKT-2.3.C3.
 *
 * ## Single-flight discipline
 *
 * The single-flight guarantee is owned by `useForgotPassword`
 * (`./use-forgot-password.ts`); this file is the pure,
 * dependency-injectable function that the hook wraps. Same pattern
 * as `submitRegistration` (TKT-2.1.D2), `submitVerifyEmail`
 * (TKT-2.2.C1), and `submitResendVerification` (TKT-2.2.D2):
 *
 *   "while a previous submitForgotPassword is pending, a second
 *    call resolves to the same result without issuing a second
 *    request."
 *
 * ## Anti-enumeration
 *
 * A successful submission and a `400` shaped by the backend as
 * "we cannot tell you whether this email exists" both resolve to
 * `{ kind: 'cooldown' }`. The mapper (TKT-2.3.B2) collapses these
 * into the same `'acknowledgement'` kind; the form renders the same
 * body regardless. There is no `'sent'` or `'exists'` kind by
 * design.
 *
 * ## Why a "cooldown" result kind
 *
 * The backend's `AUTH_THROTTLE.forgotPassword = { limit: 3, ttl: 60_000 }`
 * constrains the user to 3 requests per 60 seconds. The hook
 * mirrors this as a 60-second client-side cooldown after a
 * successful submission (the user cannot issue the 4th request
 * anyway; the UX heuristic is the countdown copy). A success
 * resolution therefore returns `{ kind: 'cooldown' }` so the
 * hook can transition to the `'cooldown'` state and start the
 * timer.
 *
 * ## Why no navigate
 *
 * The forgot-password page keeps the user on the same URL. There
 * is no "next route" — the page updates in place. This is the
 * counter-design that Epic 2.3 explicitly endorses. A navigate to
 * a "we sent an email" page that distinguished "we sent" from "we
 * would have sent" was the original oracle; the in-place update
 * avoids it.
 */

// `forgotPassword` is the auth-service re-export (TKT-2.3.B1). The
// helper calls it through a dependency so the unit suite can stub
// the network without module mocks.
import { forgotPassword as defaultForgotPassword } from "@/features/auth/services/auth.service";

import {
  mapForgotPasswordError,
  type ForgotPasswordErrorKind,
} from "@/features/auth/errors/recovery-error-mapper";

import {
  FORGOT_PASSWORD_COOLDOWN_MS,
} from "./recovery-cooldown";

/**
 * Result shape for `submitForgotPassword`.
 *
 *   `cooldown` — successful submission. The hook transitions to
 *                `'cooldown'` for `FORGOT_PASSWORD_COOLDOWN_MS`.
 *   `error`    — any mapper-collapsed kind. The page renders the
 *                same neutral acknowledgement body but may overlay
 *                a `rate_limited` or `server` copy.
 *
 * The two kinds are intentionally the only outcomes; the success
 * path is "cooldown" because that is the visible effect of a
 * successful submit.
 */
export type ForgotSubmitResult =
  | { kind: "cooldown"; cooldownMs: typeof FORGOT_PASSWORD_COOLDOWN_MS }
  | {
      kind: "error";
      errorKind: ForgotPasswordErrorKind;
    };

/**
 * In-place acknowledgement constant. The forgot page never navigates
 * after a successful or erroneous submission; the URL stays
 * `/forgot-password` and the body changes. This is the counter-design
 * Epic 2.3 explicitly endorses — the alternative (router.replace to
 * a success page that interpolated the email) was the original
 * oracle.
 */
export const FORGOT_ACK_IN_PLACE = null;

export interface SubmitForgotPasswordDeps {
  /**
   * The backend `forgotPassword` call. Re-exported from
   * `auth.service.ts` but injected via this dependency so the unit
   * suite (TKT-2.3.D3) can substitute a stub without module mocks.
   */
  forgotPassword: (dto: { email: string }) => Promise<unknown>;
  /**
   * Override for the cooldown window. Default is the documented
   * constant from `recovery-cooldown.ts`. The unit suite passes a
   * small value (e.g. `10`) so it does not have to wait 60 s.
   */
  cooldownMs?: number;
}

/**
 * Default dependencies: the real `auth.service.forgotPassword` plus
 * the documented cooldown window. Hooks default to these; tests
 * typically pass a stub.
 */
export const defaultSubmitForgotPasswordDeps: SubmitForgotPasswordDeps = {
  forgotPassword: defaultForgotPassword,
};

/**
 * Pure, dependency-injectable forgot-password submit. Always
 * resolves with a `ForgotSubmitResult`; never rejects. Errors are
 * mapped through `mapForgotPasswordError`.
 *
 * @param email  - the validated email from the form. The caller is
 *                 responsible for the schema-level predicate
 *                 (TKT-2.3.C1); this helper trusts the input.
 * @param deps   - the `forgotPassword` function and an optional
 *                 `cooldownMs` override.
 */
export async function submitForgotPassword(
  email: string,
  deps: SubmitForgotPasswordDeps = defaultSubmitForgotPasswordDeps,
): Promise<ForgotSubmitResult> {
  const cooldownMs = (deps.cooldownMs ?? FORGOT_PASSWORD_COOLDOWN_MS) as typeof FORGOT_PASSWORD_COOLDOWN_MS;
  try {
    await deps.forgotPassword({ email });
    return { kind: "cooldown", cooldownMs };
  } catch (err: unknown) {
    const mapped = mapForgotPasswordError(err);
    return {
      kind: "error",
      errorKind: mapped.kind,
    };
  }
}