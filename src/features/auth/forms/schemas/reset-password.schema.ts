import { z } from "zod";

import { passwordPolicySchema } from "./password.schema";

const TOKEN_MIN = 32;
const TOKEN_MAX = 128;
const HEX_PATTERN = /^[a-f0-9]+$/i;

export const tokenResetSchema = z
  .string()
  .min(TOKEN_MIN, `Token must be at least ${TOKEN_MIN} characters`)
  .max(TOKEN_MAX, `Token must be at most ${TOKEN_MAX} characters`)
  .regex(HEX_PATTERN, "Token format is invalid");

export const newPasswordSchema = passwordPolicySchema;

export const resetPasswordSchema = z
  .object({
    token: tokenResetSchema,
    newPassword: newPasswordSchema,
    newPasswordConfirmation: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirmation, {
    path: ["newPasswordConfirmation"],
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
