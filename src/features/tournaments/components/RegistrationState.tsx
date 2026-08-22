"use client";

import { Check, Clock, AlertCircle, XCircle } from "lucide-react";

import { cn } from "@/shared/utils/merge-class-names";

import type { RegistrationStatus } from "@/features/tournaments/types";
import { REGISTRATION_STATE_TOKENS } from "@/features/tournaments/lib/tournament-tokens";

export interface RegistrationStateProps {

  status: RegistrationStatus | null;

  className?: string;
}

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

export function RegistrationState({
  status,
  className,
}: RegistrationStateProps) {

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
        REGISTRATION_STATE_TOKENS[badge.variant].badge,
        className,
      )}
      data-testid="registration-state"
      data-status={status}
    >
      <Icon
        className={cn("h-3.5 w-3.5 shrink-0", REGISTRATION_STATE_TOKENS[badge.variant].icon)}
        aria-hidden="true"
      />
      {badge.label}
    </span>
  );
}
