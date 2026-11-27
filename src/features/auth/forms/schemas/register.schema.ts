import { z } from "zod";

import { passwordPolicySchema } from "./password.schema";

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 50;
const EMAIL_MAX = 255;

export const usernameSchema = z
  .string()
  .min(USERNAME_MIN, `Username must be at least ${USERNAME_MIN} characters`)
  .max(USERNAME_MAX, `Username must be at most ${USERNAME_MAX} characters`)
  .regex(
    USERNAME_PATTERN,
    "Username may only contain letters, numbers, periods, underscores, and hyphens",
  );

export const emailSchema = z
  .string()
  .email("Please enter a valid email address")
  .max(EMAIL_MAX, `Email must be at most ${EMAIL_MAX} characters`);

export const passwordSchema = passwordPolicySchema;

export const registerSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    passwordConfirmation: z.string().min(1, "Please confirm your password"),
    agreeToTerms: z.boolean().refine((value) => value === true, {
      message: "You must agree to the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "Passwords don't match",
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

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
