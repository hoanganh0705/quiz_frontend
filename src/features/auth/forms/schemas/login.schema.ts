import { z } from "zod";

import { loginPasswordSchema } from "./password.schema";
import { emailSchema } from "./register.schema";

export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
  rememberMe: z.boolean().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export function toLoginDto(values: LoginFormValues): {
  email: string;
  password: string;
  rememberMe?: boolean;
} {
  return {
    email: values.email,
    password: values.password,
    rememberMe: values.rememberMe ?? false,
  };
}
