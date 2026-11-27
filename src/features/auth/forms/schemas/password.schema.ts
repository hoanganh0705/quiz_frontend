import { z } from "zod";

export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
} as const;

export const PASSWORD_CHECKS = {
  minLength: (value: string): boolean =>
    value.length >= PASSWORD_POLICY.minLength,
  uppercase: (value: string): boolean => /[A-Z]/.test(value),
  number: (value: string): boolean => /\d/.test(value),
  symbol: (value: string): boolean => /[^A-Za-z0-9]/.test(value),
} as const;

export const loginPasswordSchema = z
  .string()
  .min(1, "Password is required")
  .max(
    PASSWORD_POLICY.maxLength,
    `Password must be at most ${PASSWORD_POLICY.maxLength} characters`,
  );

/**
 * Single source of truth for password validation across signup, password reset,
 * and account password change flows.
 */
export const passwordPolicySchema = z
  .string()
  .min(
    PASSWORD_POLICY.minLength,
    `Password must be at least ${PASSWORD_POLICY.minLength} characters`,
  )
  .max(
    PASSWORD_POLICY.maxLength,
    `Password must be at most ${PASSWORD_POLICY.maxLength} characters`,
  )
  .refine(PASSWORD_CHECKS.uppercase, {
    message: "Password must include at least one uppercase letter",
  })
  .refine(PASSWORD_CHECKS.number, {
    message: "Password must include at least one number",
  })
  .refine(PASSWORD_CHECKS.symbol, {
    message: "Password must include at least one symbol",
  });
