"use client";

import { useMemo } from "react";

import { cn } from "@/shared/utils/merge-class-names";

import { getPasswordStrength } from "@/features/auth/utils/password-strength";

import type { PasswordStrengthScore } from "@/features/auth/utils/password-strength";

const SEGMENT_COUNT = 4;

const SCORE_COLOR_CLASS: Record<PasswordStrengthScore, string> = {
  0: "bg-destructive",
  1: "bg-rose-500",
  2: "bg-amber-500",
  3: "bg-emerald-500",
  4: "bg-emerald-600 dark:bg-emerald-400",
};

export interface PasswordStrengthMeterProps {
  password: string;
  heading?: string;
  requirementsCopy?: string;
  labelResolver?: (score: PasswordStrengthScore, defaultLabel: string) => string;
  testId?: string;
  labelTestId?: string;
  className?: string;
}

export function PasswordStrengthMeter({
  password,
  heading = "Strength",
  requirementsCopy,
  labelResolver,
  testId,
  labelTestId,
  className,
}: PasswordStrengthMeterProps) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const label = labelResolver
    ? labelResolver(strength.score, strength.label)
    : strength.label;

  return (
    <div
      className={cn("space-y-1.5", className)}
      aria-live="polite"
      aria-label={heading}
      data-testid={testId}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{heading}</span>
        <span className="font-medium text-foreground" data-testid={labelTestId}>
          {label}
        </span>
      </div>
      <div
        className="grid grid-cols-4 gap-1"
        role="progressbar"
        aria-label="Password strength"
        aria-valuemin={0}
        aria-valuemax={SEGMENT_COUNT}
        aria-valuenow={strength.score}
      >
        {Array.from({ length: SEGMENT_COUNT }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-1.5 rounded-full transition-colors",
              index < strength.score
                ? SCORE_COLOR_CLASS[strength.score]
                : "bg-muted",
            )}
          />
        ))}
      </div>
      {requirementsCopy ? (
        <p className="text-xs text-muted-foreground">{requirementsCopy}</p>
      ) : null}
    </div>
  );
}
