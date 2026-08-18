

import { z } from 'zod';

import { emailSchema } from './register.schema';

export const forgotPasswordSchema = z.object({
email: emailSchema,
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function toForgotPasswordDto(values: ForgotPasswordFormValues): {
email: string;
} {
return {
email: values.email,
  };
}