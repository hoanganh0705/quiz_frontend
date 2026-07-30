/**
 * Verify-email submit handler — single-flight `POST /auth/verify-email`.
 *
 * Source epic: Epic 2.2 — Email verification and resend.
 * Source ticket: TKT-2.2.C1.
 *
 * ## Single-flight discipline
 *
 * The single-flight guarantee is owned by the `useVerifyEmail` hook
 * (`./use-verify-email.ts`); this file is the pure,
 * dependency-injectable function that the hook wraps. The same
 * pattern that `submitRegistration` (TKT-2.1.D2) and
 * `submitResendVerification` (TKT-2.2.D2) follow: keeping the slot
 * in a `useRef` at the hook level preserves SSR safety, renders
 * the function pure, and lets the vitest suite substitute a
 * deterministic in-memory implementation without global
 * side-effects.
 *
 * The contract is the same:
 *
 *   "while a previous submitVerifyEmail is pending, a second call
 *    resolves to the same result without issuing a second request."
 *
 * ## Token-scoped re-fire protection
 *
 * The hook also owns token-scoped re-fire protection (acceptance
 * criterion TKT-2.2.C1-3): re-rendering the hook with the same
 * `token` does not re-fire. The helper itself is unaware of this
 * constraint — it just receives a token and calls the SDK.
 *
 * ## Error mapping
 *
 * `mapVerifyEmailError` (TKT-2.2.B2) is the only place an `ApiError`
 * becomes a UI kind. `submitVerifyEmail` swallows the rejection,
 * translates it via the mapper, and resolves with the translated
 * shape. The form never sees a rejected `Promise` and never has
 * access to the raw error.
 *
 * ## Anti-enumeration
 *
 * A successful submission and a `400` shaped by the backend as
 * "we cannot tell you whether this token is valid" both resolve to
 * `{ kind: 'done' }`. The mapper collapses these into the same
 * `acknowledgement` kind; the form renders the same body regardless.
 * There is no `'verified'` or `'expired'` kind by design.
 *
 * ## Why no navigate
 *
 * The verify page keeps the user on the same URL regardless of
 * outcome. TKT-2.2.C3 removes the auto-navigation to
 * `/login?verified=1` exactly because that navigation was an oracle
 * (its premise was "verification succeeded"). The helper
 * intentionally does not return a `nextRoute`; the page is in
 * charge of its own acknowledgement.
 */

// `verifyEmail` is the auth-service re-export (TKT-2.1.E2). The
// helper calls it through a dependency so the unit suite can stub
// the network without module mocks.
import { verifyEmail as defaultVerifyEmail } from "@/features/auth/service/auth.service";

import {
  mapVerifyEmailError,
  type VerifyEmailErrorKind,
} from "@/features/auth/errors/verify-email-error-mapper";

/**
 * Result shape for `submitVerifyEmail`. The page renders the same
 * acknowledgement body for `done` and `error`; the discriminator is
 * retained for the cases where the page wants to overlay a
 * `rate_limited` copy (D3 mirrors this for the resend flow).
 */
export type VerifySubmitResult =
  | { kind: "done" }
  | {
      kind: "error";
      errorKind: VerifyEmailErrorKind;
    };

/**
 * In-place acknowledgement constant. The verify page never
 * navigates after a successful or erroneous submission; the URL
 * stays `/verify-email` and the body changes. This is the
 * counter-design Epic 2.2 explicitly endorses — the alternative
 * (`router.replace('/login?verified=1')`) was the original oracle.
 */
export const VERIFY_ACK_IN_PLACE = null;

export interface SubmitVerifyEmailDeps {
  /**
   * The backend `verifyEmail` call. Re-exported from
   * `auth.service.ts` but injected via this dependency so the unit
   * suite (TKT-2.2.E3) can substitute a stub without module mocks.
   */
  verifyEmail: (dto: { token: string }) => Promise<unknown>;
}

/**
 * Default dependencies: the real `auth.service.verifyEmail`. Hooks
 * default to these; tests typically pass a stub.
 */
export const defaultSubmitVerifyEmailDeps: SubmitVerifyEmailDeps = {
  verifyEmail: defaultVerifyEmail,
};

/**
 * Pure, dependency-injectable verify-email submit. Always resolves
 * with a `VerifySubmitResult`; never rejects. Errors are mapped
 * through `mapVerifyEmailError`.
 *
 * @param token   - the token from the URL `?token=` query. The
 *                  caller is responsible for the C2 well-formed
 *                  predicate; this helper trusts the input.
 * @param deps    - the `verifyEmail` function.
 */
export async function submitVerifyEmail(
  token: string,
  deps: SubmitVerifyEmailDeps = defaultSubmitVerifyEmailDeps,
): Promise<VerifySubmitResult> {
  try {
    await deps.verifyEmail({ token });
    return { kind: "done" };
  } catch (err: unknown) {
    const mapped = mapVerifyEmailError(err);
    return {
      kind: "error",
      errorKind: mapped.kind,
    };
  }
}

/**
 * Well-formed predicate for the C2 client-side guard. Mirrors
 * `VerifyEmailDto.token` constraints (`minLength 32`, `maxLength
 * 512`).
 *
 * Kept here, not in the hook, because the vitest suite exercises
 * it as a pure function (TKT-2.2.E3). The hook imports it via
 * `./verify-email-submit.js` so both the hook and the unit suite
 * use the same source of truth.
 */
export const TOKEN_MIN_LEN = 32;
export const TOKEN_MAX_LEN = 512;

export function isWellFormedVerifyToken(token: string): boolean {
  if (typeof token !== "string") return false;
  const trimmed = token.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.length < TOKEN_MIN_LEN) return false;
  if (trimmed.length > TOKEN_MAX_LEN) return false;
  return true;
}
