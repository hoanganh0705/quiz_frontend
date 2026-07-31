/**
 * Client-side login schema — single source of truth for the
 * validation contract on the `/login` form.
 *
 * Source epic: Epic 2.4 — Login, logout, and protected-route return flow.
 * Source ticket: TKT-2.4.B2.
 *
 * ## Inputs
 *
 * Constraints mirror the backend's `LoginDto`:
 *
 *   - `email`: `<= 255` characters, well-formed address
 *   - `password`: `6..100` characters (reuses the registration password policy)
 *
 * The schema mirrors those constraints so a user with bad input
 * never pays the round-trip. It is NOT the authoritative validator
 * — the backend's `LoginDto` is.
 *
 * `rememberMe` is a form-only field; the backend never sees it.
 * The ticket (TKT-2.4.B2) chose to include it in the schema for
 * parity with the existing login page (which carries the checkbox),
 * but it is stripped by `toLoginDto` before the wire call.
 */

import { z } from 'zod';
import { emailSchema, passwordSchema } from '../schemas/register.schema';

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: z.boolean().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Adapter from the form values to the backend's `LoginDto`.
 *
 * The form keeps `rememberMe` as a form-only field; `LoginDto`
 * only takes `{ email, password }`. The adapter is the single place
 * that performs the `pick` — no caller may write
 * `auth.service.login({ ...values })` directly.
 */
export function toLoginDto(values: LoginFormValues): {
  email: string;
  password: string;
} {
  return {
    email: values.email,
    password: values.password,
  };
}
