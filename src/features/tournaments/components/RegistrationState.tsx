"use client";

/**
 * `RegistrationState` — registration status indicator for tournament detail.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.3 — Tournament registration and participant-state mutations.
 * Source ticket: TKT-5.3.D2.
 *
 * ## Purpose
 *
 * Renders a compact, non-interactive badge that communicates the current
 * user's registration status at a glance. This is a read indicator —
 * not an action button.
 *
 * ## Variants
 *
 * - `registered`: green badge
 * - `eligible`: neutral badge (not registered but can register)
 * - `not_eligible`: gray badge
 * - `closed`: gray badge (registration window closed)
 * - `full`: gray badge (tournament at capacity)
 * - `unknown`: nothing rendered (user is unauthenticated)
 */

import { Check, Clock, AlertCircle, XCircle } from "lucide-react";

import { cn } from "@/shared/utils/merge-class-names";

import type { RegistrationStatus } from "@/features/tournaments/types";

export interface RegistrationStateProps {
  /** The registration status to display. */
  status: RegistrationStatus | null;
  /** Optional className for the root element. */
  className?: string;
}

/**
 * Map status to badge content and style.
 */
function getBadgeContent(status: RegistrationStatus) {
  switch (status) {
    case "registered":
      return {
        label: "Registered",
        icon: Check,
        variant: "success" as const,
      };
    case "eligible":
      return {
        label: "Registration open",
        icon: Clock,
        variant: "neutral" as const,
      };
    case "not_eligible":
      return {
        label: "Not eligible",
        icon: AlertCircle,
        variant: "muted" as const,
      };
    case "closed":
      return {
        label: "Registration closed",
        icon: XCircle,
        variant: "muted" as const,
      };
    case "full":
      return {
        label: "Tournament full",
        icon: AlertCircle,
        variant: "muted" as const,
      };
    case "unknown":
    default:
      return null;
  }
}

const variantClasses = {
  success: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800",
  neutral: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800",
  muted: "bg-muted text-muted-foreground border-border dark:bg-muted dark:text-muted-foreground dark:border-border",
} as const;

const iconVariantClasses = {
  success: "text-green-600 dark:text-green-400",
  neutral: "text-blue-600 dark:text-blue-400",
  muted: "text-muted-foreground",
} as const;

/**
 * The registration status indicator badge.
 */
export function RegistrationState({
  status,
  className,
}: RegistrationStateProps) {
  // `unknown` or `null`: nothing rendered (user is unauthenticated)
  if (status === null || status === "unknown") {
    return null;
  }

  const badge = getBadgeContent(status);
  if (!badge) {
    return null;
  }

  const Icon = badge.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        variantClasses[badge.variant],
        className,
      )}
      data-testid="registration-state"
      data-status={status}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", iconVariantClasses[badge.variant])} aria-hidden="true" />
      {badge.label}
    </span>
  );
}
