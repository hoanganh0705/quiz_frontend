import { PASSWORD_CHECKS } from "@/features/auth/forms/schemas/password.schema";

export type PasswordStrengthScore = 0 | 1 | 2 | 3 | 4;

export type PasswordStrengthResult = {
  score: PasswordStrengthScore;
  label: string;
  checks: {
    minLength: boolean;
    uppercase: boolean;
    number: boolean;
    symbol: boolean;
  };
};

const LABELS: Record<PasswordStrengthScore, string> = {
  0: "Too weak",
  1: "Weak",
  2: "Fair",
  3: "Good",
  4: "Strong",
};

export function getPasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      score: 0,
      label: LABELS[0],
      checks: {
        minLength: false,
        uppercase: false,
        number: false,
        symbol: false,
      },
    };
  }

  const checks = {
    minLength: PASSWORD_CHECKS.minLength(password),
    uppercase: PASSWORD_CHECKS.uppercase(password),
    number: PASSWORD_CHECKS.number(password),
    symbol: PASSWORD_CHECKS.symbol(password),
  };

  const score = Object.values(checks).filter(Boolean)
    .length as PasswordStrengthScore;

  return {
    score,
    label: LABELS[score],
    checks,
  };
}
