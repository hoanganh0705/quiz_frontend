/**
 * Registration submit handler — single-flight `POST /auth/register`.
 *
 * Source epic: Epic 2.1 — Registration form and availability guidance.
 * Source tickets: TKT-2.1.D2 (single-flight), TKT-2.1.D3 (error mapping).
 *
 * ## Single-flight discipline
 *
 * The single-flight guarantee is owned by the
 * `useRegistrationSubmit` hook (`./use-registration-submit.ts`); this
 * file is the pure, dependency-injectable function that the hook
 * wraps. Keeping the discipline in the hook (via a `useRef`)
 * instead of module-level state preserves SSR safety and lets the
 * vitest suite substitute a deterministic in-memory implementation
 * without global side-effects.
 *
 * The hook forwards rapid repeated calls to the same in-flight
 * `Promise`; from the caller's perspective the contract is
 *
 *   "while a previous submitRegistration is pending, a second call
 *    resolves to the same result without issuing a second request."
 *
 * ## Error mapping
 *
 * `mapRegisterError` (TKT-2.1.B2) is the only place an `ApiError`
 * becomes a UI kind. `submitRegistration` swallows the rejection,
 * translates it via the mapper, and resolves with the translated
 * shape — the form never sees a rejected `Promise` and never has
 * access to the raw error.
 *
 * ## Anti-enumeration
 *
 * The acknowledgement page (TKT-2.1.D4) renders the same body for
 * a successful 201 and a 4xx shaped by the backend as "we cannot
 * tell you whether this email is registered" — the backend's
 * problem. On the client, a successful submit resolves to
 * `{ kind: 'ok' }` regardless of backend detail; a 4xx resolves to
 * one of `{ kind: 'validation' | 'rate_limited' | 'server' | 'forbidden' }`.
 * There is no `'already taken'` kind, by design. Any pre-existing copy
 * or component that renders "your email is taken" was a leak; this
 * handler makes that branch literally inexpressible.
 */

import { register as defaultRegister } from '@/features/auth/service/auth.service';

import type { RegisterFormValues, RegisterFieldErrors } from './schemas/register.schema';
import { toRegisterDto } from './schemas/register.schema';
import {
  mapRegisterError,
  type RegisterErrorKind,
} from '@/features/auth/errors/register-error-mapper';

export type RegistrationSubmitResult =
  | { kind: 'ok'; nextRoute: string }
  | {
      kind: 'error';
      errorKind: RegisterErrorKind;
      fieldErrors?: RegisterFieldErrors;
      globalMessage?: string;
    };

/**
 * Acknowledge route for a successful submission. Hard-coded here
 * (rather than configured) so the F2 anti-enumeration snapshot test
 * has a single source of truth.
 */
export const ACKNOWLEDGE_ROUTE = '/register/check-inbox';

export interface SubmitRegistrationDeps {
  /**
   * The backend `register` call. Re-exported from `auth.service.ts`
   * but injected via this dependency so the unit suite (TKT-2.1.E3)
   * can substitute a stub without mocking modules.
   */
  register: (
    dto: { username: string; email: string; password: string }
  ) => Promise<unknown>;
  /** Optional default redirect target; default = `ACKNOWLEDGE_ROUTE`. */
  ackRoute?: string;
}

/**
 * Default dependencies: the real `auth.service.register` and the
 * project-wide acknowledge route. Hooks default to these; tests
 * typically pass a stub.
 */
export const defaultSubmitDeps: SubmitRegistrationDeps = {
  register: defaultRegister,
  ackRoute: ACKNOWLEDGE_ROUTE,
};

/**
 * Pure, dependency-injectable registration submit. Always resolves
 * with a `RegistrationSubmitResult`; never rejects. Errors are
 * mapped through `mapRegisterError`.
 *
 * @param values  - the form values, already zod-validated by the caller.
 * @param deps    - the `register` function and the acknowledgement route.
 */
export async function submitRegistration(
  values: RegisterFormValues,
  deps: SubmitRegistrationDeps = defaultSubmitDeps
): Promise<RegistrationSubmitResult> {
  const ackRoute = deps.ackRoute ?? ACKNOWLEDGE_ROUTE;
  try {
    await deps.register(toRegisterDto(values));
    return { kind: 'ok', nextRoute: ackRoute };
  } catch (err: unknown) {
    const mapped = mapRegisterError(err);
    return {
      kind: 'error',
      errorKind: mapped.kind,
      fieldErrors: mapped.fieldErrors,
      globalMessage: mapped.globalMessage,
    };
  }
}
