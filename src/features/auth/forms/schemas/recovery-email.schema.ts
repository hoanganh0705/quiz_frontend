import { z } from "zod";

import { emailSchema } from "./register.schema";

export const recoveryEmailSchema = z.object({
  email: emailSchema,
});

export const forgotPasswordSchema = recoveryEmailSchema;
export const resendVerificationSchema = recoveryEmailSchema;

export type RecoveryEmailFormValues = z.infer<typeof recoveryEmailSchema>;
export type ForgotPasswordFormValues = RecoveryEmailFormValues;
export type ResendVerificationFormValues = RecoveryEmailFormValues;

export function toRecoveryEmailDto(values: RecoveryEmailFormValues): {
  email: string;
} {
  return { email: values.email };
}

export const toForgotPasswordDto = toRecoveryEmailDto;
export const toResendVerificationDto = toRecoveryEmailDto;
