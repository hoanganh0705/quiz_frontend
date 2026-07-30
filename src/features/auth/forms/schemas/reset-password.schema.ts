/**
 * Client-side reset-password schema — single source of truth for the
 * validation contract on the `/reset-password` form.
 *
 * Source epic: Epic 2.3 — Forgot-password and reset-password recovery.
 * Source ticket: TKT-2.3.C2.
 *
 * ## Inputs
 *
 * Constraints come from the generated SDK's `ResetPasswordDto`
 * (`src/lib/api/generated/schemas/resetPasswordDto.ts`):
 *
 *   - `token`: `@minLength 32`, `@maxLength 128`. The doc-comment
 *     "64-character hex string" is misleading — the actual
 *     constraint is 32–128 chars (see A1 evidence
 *     `EPIC_2_3_A1.md` §2.2). The schema uses the actual constraint.
 *   - `newPassword`: `@minLength 8`, `@maxLength 128` plus the
 *     shared registration policy (1 uppercase, 1 number, 1 symbol).
 *
 * The client-side schema mirrors those constraints so a user with
 * bad input never pays the round-trip. It is NOT the authoritative
 * validator — the backend's `class-validator` is. The two must
 * agree; the spot-check test in `recovery-flow.spec.ts` (TKT-2.3.D3)
 * asserts that the constraints here match `ResetPasswordDto` byte-
 * for-byte.
 *
 * ## How newPassword is tightened to 8 chars
 *
 * The shared `passwordSchema` (TKT-2.1.D1) enforces `minLength 6` —
 * the registration contract. `ResetPasswordDto.newPassword` is
 * `minLength 8`. Rather than loosening the registration policy or
 * fragmenting the password rule into two schemas, this schema
 * composes the registration policy with an explicit `minLength 8`
 * refinement. The reset form is strictly stricter than registration;
 * a password accepted on registration is always accepted on reset.
 *
 * ## Token regex is best-effort
 *
 * The backend accepts any 32–128 char string for `token`; the regex
 * `/^[a-f0-9]+$/i` is **client-side only** and catches copy-paste
 * corruption (a stray space, a copy-paste that includes the URL's
 * query string). The regex is enforced client-side and never
 * surfaces a "your token is malformed" message — the B2 mapper
 * collapses any backend rejection (UNKNOWN, EXPIRED, CONSUMED) into
 * the same `'invalid_link'` kind.
 *
 * ## What this file deliberately does not do
 *
 * - It does NOT duplicate the password rule. `passwordSchema` from
 *   TKT-2.1.D1 is imported and refined.
 * - It does NOT add an anti-enumeration branch. The reset mapper
 *   handles the backend's `AUTH_INVALID_TOKEN` family by collapsing
 *   all three cases into a single `'invalid_link'` kind; the schema
 *   only enforces token length and password policy.
 */

import { z } from 'zod';

import { passwordSchema } from './register.schema';

const TOKEN_MIN = 32;
const TOKEN_MAX = 128;
const NEW_PASSWORD_MIN = 8;
const NEW_PASSWORD_MAX = 128;
const HEX_PATTERN = /^[a-f0-9]+$/i;

/**
 * Token validator mirroring `ResetPasswordDto.token.constraints`
 * (`@minLength 32`, `@maxLength 128`). The regex is best-effort
 * client-side protection against copy-paste corruption; the backend
 * accepts any 32–128 char string and returns `AUTH_INVALID_TOKEN`
 * for the malformed case.
 */
export const tokenResetSchema = z
  .string()
  .min(TOKEN_MIN, `Token must be at least ${TOKEN_MIN} characters`)
  .max(TOKEN_MAX, `Token must be at most ${TOKEN_MAX} characters`)
  .regex(HEX_PATTERN, 'Token format is invalid');

/**
 * New-password validator. Refines the registration `passwordSchema`
 * (6..100 with policy) up to the backend's stricter `ResetPasswordDto`
 * contract: `minLength 8`, `maxLength 128`. The `refine` step is
 * additive; a password meeting the registration policy also meets
 * the reset policy.
 */
export const newPasswordSchema = passwordSchema
  .refine((value) => value.length >= NEW_PASSWORD_MIN, {
    message: `Password must be at least ${NEW_PASSWORD_MIN} characters`,
  })
  .refine((value) => value.length <= NEW_PASSWORD_MAX, {
    message: `Password must be at most ${NEW_PASSWORD_MAX} characters`,
  });

/**
 * Schema for the reset-password form. Mirrors the registration
 * form's structure (token / newPassword / newPasswordConfirmation)
 * with the new-password refinement and the equality rule.
 *
 * `newPasswordConfirmation` is a form-only field; the backend never
 * sees it. The `.refine` step enforces equality with `newPassword`.
 */
export const resetPasswordSchema = z
  .object({
    token: tokenResetSchema,
    newPassword: newPasswordSchema,
    newPasswordConfirmation: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirmation, {
    path: ['newPasswordConfirmation'],
    message: "Passwords don't match",
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

/**
 * Adapter from the form values to the backend's `ResetPasswordDto`.
 *
 * The form keeps `newPasswordConfirmation` as a form-only field;
 * `ResetPasswordDto` only takes `{ token, newPassword }`. The adapter
 * is the single place that performs the `pick` — no caller may write
 * `resetPassword({ token: values.token, newPassword: values.newPassword })`
 * directly, because tomorrow's ticket might add a `confirmationType`
 * field the wire does not consume.
 */
export function toResetPasswordDto(values: ResetPasswordFormValues): {
  token: string;
  newPassword: string;
} {
  return {
    token: values.token,
    newPassword: values.newPassword,
  };
}