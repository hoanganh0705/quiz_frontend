"use client";

/**
 * `TournamentPlaceholder` — safe fallback when feature flag is 'placeholder'.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.2 — Tournament discovery and read-only detail surfaces.
 * Source ticket: TKT-5.2.F1.
 */

import * as React from "react";

import { Trophy } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

export interface TournamentPlaceholderProps {
  /** Optional title override. */
  title?: string;
  /** Optional description override. */
  description?: string;
  /** Optional class name. */
  className?: string;
}

export function TournamentPlaceholder({
  title,
  description,
  className,
}: TournamentPlaceholderProps) {
  return (
    <EmptyState
      icon={Trophy}
      title={title ?? "Tournaments Coming Soon"}
      description={
        description ??
          "Tournament features are currently under development. Check back soon!"
      }
      size="lg"
      className={className}
    />
  );
}
