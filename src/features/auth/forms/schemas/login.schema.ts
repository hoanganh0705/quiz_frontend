

import { z } from 'zod';
import { emailSchema, passwordSchema } from '../schemas/register.schema';

export const loginSchema = z.object({
email: emailSchema,
password: passwordSchema,
rememberMe: z.boolean().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export function toLoginDto(values: LoginFormValues): {
email: string;
password: string;
} {
return {
email: values.email,
password: values.password,
  };
}
