/**
 * Client-side registration schema — single source of truth for the
 * validation contract on the new-`/signup` form.
 *
 * Source epic: Epic 2.1 — Registration form and availability guidance.
 * Source ticket: TKT-2.1.D1.
 *
 * ## Inputs
 *
 * Constraints come from the generated SDK's `RegisterDto`
 * (`src/lib/api/generated/schemas/registerDto.ts`):
 *
 *   - `username`: `^[a-zA-Z0-9._-]+$`, `3..50`
 *   - `email`: `<= 255` characters, well-formed address
 *   - `password`: `6..100`, must contain 1 uppercase, 1 number, 1 symbol
 *
 * The client-side schema mirrors those constraints so a user with bad
 * input never pays the round-trip. It is NOT the authoritative validator
 * — the backend's `RegisterDto` is. The two must agree; the spot-check
 * test in `register-flow.spec.ts` (TKT-2.1.E3) asserts that the
 * constraints here match `RegisterDto.constraints` byte-for-byte.
 *
 * `passwordConfirmation` is a form-only field; the backend never sees
 * it. The `.refine` step enforces equality with `password`.
 *
 * ## What this file deliberately does not do
 *
 * - It does NOT enforce a uniqueness check. Uniqueness is a backend
 *   concern; the client-side anti-enumeration mapper (TKT-2.1.B2)
 *   handles 4xx shaped as if "already taken" — the schema only
 *   enforces format and length.
 * - It does NOT enforce a "minimum-strength" rule that conflicts with
 *   the backend's password rule. The frontend's existing
 *   `password-strength.ts` already gives UX feedback; combining that
 *   with a stricter zod rule here would produce two competing
 *   verdicts.
 */

import { z } from 'zod';

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 50;
const EMAIL_MAX = 255;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 100;

/**
 * Username validator mirroring `RegisterDto.username` constraints.
 * Exported so the indicator hook (TKT-2.1.C2) can short-circuit
 * debouncing on bad input without re-encoding the rule.
 */
export const usernameSchema = z
  .string()
  .min(USERNAME_MIN, `Username must be at least ${USERNAME_MIN} characters`)
  .max(USERNAME_MAX, `Username must be at most ${USERNAME_MAX} characters`)
  .regex(
    USERNAME_PATTERN,
    'Username may only contain letters, numbers, periods, underscores, and hyphens'
  );

/**
 * Email validator mirroring `RegisterDto.email.constraints`
 * (`maxLength: 255`, `format: email`). zod's `.email()` checks the
 * format; we then add the max-length guard that the backend enforces
 * separately.
 */
export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .max(EMAIL_MAX, `Email must be at most ${EMAIL_MAX} characters`);

/**
 * Password validator mirroring `RegisterDto.password.constraints`:
 * `6..100` and at least one uppercase letter, one number, and one
 * special character.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
  .max(PASSWORD_MAX, `Password must be at most ${PASSWORD_MAX} characters`)
  .refine((value) => /[A-Z]/.test(value), {
    message: 'Password must include at least one uppercase letter',
  })
  .refine((value) => /\d/.test(value), {
    message: 'Password must include at least one number',
  })
  .refine((value) => /[^A-Za-z0-9]/.test(value), {
    message: 'Password must include at least one symbol',
  });

export const registerSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    passwordConfirmation: z.string().min(1, 'Please confirm your password'),
    agreeToTerms: z
      .boolean()
      .refine((value) => value === true, {
        message: 'You must agree to the terms and conditions',
      }),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: "Passwords don't match",
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

/**
 * Adapter from the form values to the backend's `RegisterDto`.
 *
 * The form keeps `passwordConfirmation` and `agreeToTerms` as
 * form-only fields; `RegisterDto` only takes
 * `{ username, email, password }`. The adapter is the single place
 * that performs the `pick` — no caller may write `register({ ...values })`
 * directly, because tomorrow's ticket might add a marketing-consent
 * field that has no place on the wire.
 */
export function toRegisterDto(values: RegisterFormValues): {
  username: string;
  email: string;
  password: string;
} {
  return {
    username: values.username,
    email: values.email,
    password: values.password,
  };
}
