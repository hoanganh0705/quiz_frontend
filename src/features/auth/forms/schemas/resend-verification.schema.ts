/**
 * Client-side `resend-verification` schema — single source of truth
 * for the validation contract on the new `/resend-verification` form.
 *
 * Source epic: Epic 2.2 — Email verification and resend.
 * Source ticket: TKT-2.2.D1.
 *
 * ## Inputs
 *
 * Constraints come from the generated SDK's `ResendVerificationDto`
 * (`src/lib/api/generated/schemas/resendVerificationDto.ts`):
 *
 *   - `email`: `<= 255` characters, well-formed address
 *
 * The client-side schema mirrors those constraints so a user with
 * bad input never pays the round-trip. It is NOT the authoritative
 * validator — the backend's `ResendVerificationDto` is. The two must
 * agree; the spot-check test in `verify-email-flow.spec.ts`
 * (TKT-2.2.E3) asserts that the constraints here match
 * `ResendVerificationDto.constraints` byte-for-byte.
 *
 * ## Reuse rule
 *
 * The schema reuses `emailSchema` from `register.schema.ts`
 * (TKT-2.1.D1). The two rules — email format and `maxLength: 255`
 * — are documented once in the master schema import. Reviewers:
 * if the backend's `email` constraint changes for either
 * endpoint, update `register.schema.ts` first; this file
 * automatically follows.
 */

import { z } from 'zod';

import { emailSchema } from './register.schema';

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export type ResendVerificationFormValues = z.infer<typeof resendVerificationSchema>;

/**
 * Adapter from the form values to the backend's
 * `ResendVerificationDto`. The form's `email` is the only field;
 * `ResendVerificationDto` only takes `{ email }`. The adapter is
 * the single place that performs the pick — no caller may write
 * `resendVerificationEmail({ ...values })` directly, because
 * tomorrow's ticket might add a marketing-consent field that has
 * no place on the wire.
 */
export function toResendVerificationDto(values: ResendVerificationFormValues): {
  email: string;
} {
  return {
    email: values.email,
  };
}