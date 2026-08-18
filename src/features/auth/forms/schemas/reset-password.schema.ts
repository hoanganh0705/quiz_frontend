

import { z } from 'zod';

import { passwordSchema } from './register.schema';

const TOKEN_MIN = 32;
const TOKEN_MAX = 128;
const NEW_PASSWORD_MIN = 8;
const NEW_PASSWORD_MAX = 128;
const HEX_PATTERN = /^[a-f0-9]+$/i;

export const tokenResetSchema = z
  .string()
  .min(TOKEN_MIN, `Token must be at least ${TOKEN_MIN} characters`)
  .max(TOKEN_MAX, `Token must be at most ${TOKEN_MAX} characters`)
  .regex(HEX_PATTERN, 'Token format is invalid');

export const newPasswordSchema = passwordSchema
  .refine((value) => value.length >= NEW_PASSWORD_MIN, {
message: `Password must be at least ${NEW_PASSWORD_MIN} characters`,
  })
  .refine((value) => value.length <= NEW_PASSWORD_MAX, {
message: `Password must be at most ${NEW_PASSWORD_MAX} characters`,
  });

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

export function toResetPasswordDto(values: ResetPasswordFormValues): {
token: string;
newPassword: string;
} {
return {
token: values.token,
newPassword: values.newPassword,
  };
}