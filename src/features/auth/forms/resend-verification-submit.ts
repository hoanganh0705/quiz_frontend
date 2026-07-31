/**
 * Resend-verification submit handler — single-flight
 * `POST /auth/resend-verification-email`.
 *
 * Source epic: Epic 2.2 — Email verification and resend.
 * Source ticket: TKT-2.2.D2.
 *
 * ## Single-flight discipline
 *
 * Same pattern as `submitRegistration` (TKT-2.1.D2) and
 * `submitVerifyEmail` (TKT-2.2.C1): the single-flight guarantee
 * is owned by the hook (`useResendVerification`), the helper is
 * the pure, dependency-injectable function the hook wraps.
 *
 * ## Cooldown
 *
 * The hook owns a 60-second cooldown after a successful response
 * (no backend call may be issued during the cooldown). The
 * helper returns `{ kind: 'cooldown', cooldownMs }` on success,
 * which the hook consumes to start its timer. The helper itself
 * does not run timers — the hook is the place where timeouts
 * live.
 *
 * ## Error mapping
 *
 * `mapResendVerificationError` (TKT-2.2.B2) is the only place an
 * `ApiError` becomes a UI kind. `submitResendVerification`
 * swallows the rejection, translates it via the mapper, and
 * resolves with the translated shape. The form never sees a
 * rejected `Promise` and never has access to the raw error.
 *
 * ## Anti-enumeration
 *
 * A successful submission resolves to `{ kind: 'cooldown' }`
 * regardless of whether the address exists, is verified, or is
 * unverified. The page renders the same acknowledgement body for
 * every case. Resend has no `kind: 'done'` — the cooldown IS
 * the success.
 */

import { resendVerificationEmail as defaultResend } from "@/features/auth/service/auth.service";

import {
  mapResendVerificationError,
  type ResendVerificationErrorKind,
} from "@/features/auth/errors/verify-email-error-mapper";

import type { ResendVerificationFormValues } from "./schemas/resend-verification.schema";
import { toResendVerificationDto } from "./schemas/resend-verification.schema";

export type ResendSubmitResult =
  | { kind: "cooldown"; cooldownMs: number }
  | {
      kind: "error";
      errorKind: ResendVerificationErrorKind;
    };

/**
 * Cooldown window after a successful response. The hook enforces
 * "no second request during this window" via `useRef` and a
 * `setTimeout`; the helper does not run timers.
 */
export const RESEND_COOLDOWN_MS = 60_000;

/**
 * In-place acknowledgement constant. The resend page never
 * navigates after a successful or erroneous submission; the URL
 * stays `/resend-verification` and the body changes. The F2
 * Playwright anti-enumeration spec asserts the same body for
 * the three cases (verified / unverified / unknown email).
 */
export const RESEND_ACK_IN_PLACE = null;

export interface SubmitResendVerificationDeps {
  /**
   * The backend `resendVerificationEmail` call. Re-exported from
   * `auth.service.ts` but injected via this dependency so the
   * unit suite (TKT-2.2.E3) can substitute a stub.
   */
  resendVerificationEmail: (dto: { email: string }) => Promise<unknown>;
  /**
   * Optional cooldown override (default `RESEND_COOLDOWN_MS`).
   * Tests pass a small value to make the cooldown observable
   * without waiting 60 seconds.
   */
  cooldownMs?: number;
}

/**
 * Default dependencies: the real `auth.service.resendVerificationEmail`
 * and the project-wide cooldown. Hooks default to these; tests
 * typically pass a stub.
 */
export const defaultSubmitResendDeps: SubmitResendVerificationDeps = {
  resendVerificationEmail: defaultResend,
  cooldownMs: RESEND_COOLDOWN_MS,
};

/**
 * Pure, dependency-injectable resend-verification submit. Always
 * resolves with a `ResendSubmitResult`; never rejects. Errors are
 * mapped through `mapResendVerificationError`.
 *
 * @param values - the form values, already zod-validated by the
 *                 caller.
 * @param deps   - the `resendVerificationEmail` function and the
 *                 cooldown window.
 */
export async function submitResendVerification(
  values: ResendVerificationFormValues,
  deps: SubmitResendVerificationDeps = defaultSubmitResendDeps,
): Promise<ResendSubmitResult> {
  const cooldownMs = deps.cooldownMs ?? RESEND_COOLDOWN_MS;
  try {
    await deps.resendVerificationEmail(toResendVerificationDto(values));
    return { kind: "cooldown", cooldownMs };
  } catch (err: unknown) {
    const mapped = mapResendVerificationError(err);
    return {
      kind: "error",
      errorKind: mapped.kind,
    };
  }
}
