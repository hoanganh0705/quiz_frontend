

import { z } from 'zod';

import { emailSchema } from './register.schema';

export const resendVerificationSchema = z.object({
email: emailSchema,
});

export type ResendVerificationFormValues = z.infer<typeof resendVerificationSchema>;

export function toResendVerificationDto(values: ResendVerificationFormValues): {
email: string;
} {
return {
email: values.email,
  };
}