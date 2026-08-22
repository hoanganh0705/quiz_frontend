"use client";

import * as React from "react";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/shared/utils/merge-class-names";

import type { TournamentStatus } from "@/features/tournaments/types";
import { TOURNAMENT_STATUS_TOKENS } from "@/features/tournaments/lib/tournament-tokens";

export interface TournamentStatusBadgeProps {

  status: TournamentStatus | undefined;

  className?: string;
}

export function TournamentStatusBadge({
  status,
  className,
}: TournamentStatusBadgeProps) {
  if (status === undefined) {
    return null;
  }

  const config = TOURNAMENT_STATUS_TOKENS[status];

  return (
    <Badge
      variant="outline"
      className={cn("font-medium", config.variant, className)}
      aria-label={"Status: " + config.label}
    >
      {config.label}
    </Badge>
  );
}
