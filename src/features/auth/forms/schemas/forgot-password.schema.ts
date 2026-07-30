/**
 * Client-side forgot-password schema — single source of truth for the
 * validation contract on the `/forgot-password` form.
 *
 * Source epic: Epic 2.3 — Forgot-password and reset-password recovery.
 * Source ticket: TKT-2.3.C1.
 *
 * ## Inputs
 *
 * The form's only field is `email`. Constraints mirror the generated
 * SDK's `ForgotPasswordDto` (`src/lib/api/generated/schemas/forgotPasswordDto.ts`)
 * — the DTO is a bare `string` with no JSDoc `@minLength` / `@maxLength`
 * annotations, but the runtime contract is enforced by the backend's
 * `class-validator` `@IsEmail()` decorator (see A1 evidence
 * `EPIC_2_3_A1.md` §2.1). The client-side schema reuses
 * `emailSchema` from `register.schema.ts` (TKT-2.1.D1) rather than
 * re-encoding the rule.
 *
 * ## What this file deliberately does not do
 *
 * - It does NOT duplicate the email rule. The cross-epic convention
 *   from Epic 2.1 / 2.2 is that no form encodes a rule already
 *   defined elsewhere. `emailSchema` is imported, not re-typed.
 * - It does NOT add an anti-enumeration branch. The backend's
 *   `/auth/forgot-password` returns the same `200` for known-existing
 *   and unknown emails; the client-side mapper (TKT-2.3.B2) handles
 *   any 4xx surface by collapsing it into `'acknowledgement'`.
 */

import { z } from 'zod';

import { emailSchema } from './register.schema';

/**
 * Schema for the forgot-password form. The form has a single field,
 * `email`, that mirrors the registration form's `emailSchema`.
 *
 * The schema deliberately exposes only what the form needs: the
 * single `email` field. Any future field (e.g. a marketing-consent
 * checkbox) lands here in the same PR that adds it to the backend.
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

/**
 * Adapter from the form values to the backend's `ForgotPasswordDto`.
 *
 * Today the form values and the wire DTO are structurally identical
 * (`{ email }`). The adapter is the single place that performs the
 * mapping — no caller may write `forgotPassword({ email: values.email })`
 * directly, because tomorrow's ticket might add a `clientMetadata`
 * field the wire does not consume.
 */
export function toForgotPasswordDto(values: ForgotPasswordFormValues): {
  email: string;
} {
  return {
    email: values.email,
  };
}